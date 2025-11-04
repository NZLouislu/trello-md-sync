#!/usr/bin/env node

import "dotenv/config";
import { validateAndEnsureDirectory } from "../utils/directory-manager";
import { validateTrelloConfigCached, createPerformanceBenchmark } from "../utils/performance-optimizer";
import { TrelloProvider } from "../trello/provider";
import path from "path";

interface ValidateConfigArgs {
  trelloKey?: string;
  trelloToken?: string;
  trelloBoardId?: string;
  mdInputDir?: string;
  mdOutputDir?: string;
  projectRoot?: string;
  verbose?: boolean;
}

async function testTrelloConnectivity(key: string, token: string, boardId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const provider = new TrelloProvider({
      auth: { key, token },
      listMap: {},
      checklistName: "Todos"
    });

    await provider.getLists(boardId);
    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to connect to Trello API"
    };
  }
}

export async function validateConfig(args: ValidateConfigArgs = {}): Promise<{
  success: boolean;
  errors: string[];
  warnings: string[];
  metrics?: {
    validationTime: number;
    directoryCheckTime: number;
    connectivityTime: number;
    totalTime: number;
  };
}> {
  const benchmark = createPerformanceBenchmark();
  const overallEnd = benchmark.start('overall-validation');

  const errors: string[] = [];
  const warnings: string[] = [];

  const projectRoot = args.projectRoot || process.cwd();
  const key = args.trelloKey !== undefined ? args.trelloKey : (process.env.TRELLO_KEY || "");
  const token = args.trelloToken !== undefined ? args.trelloToken : (process.env.TRELLO_TOKEN || "");
  const boardId = args.trelloBoardId !== undefined ? args.trelloBoardId : (process.env.TRELLO_BOARD_ID || "");

  const configEnd = benchmark.start('config-validation');
  const configValidation = validateTrelloConfigCached({
    trelloKey: key,
    trelloToken: token,
    trelloBoardId: boardId
  });
  configEnd();

  if (!configValidation.result.isValid) {
    configValidation.result.errors.forEach(error => {
      errors.push(`${error.field}: ${error.message}${error.suggestion ? ` (${error.suggestion})` : ''}`);
    });
  }

  configValidation.result.warnings.forEach(warning => {
    warnings.push(`${warning.field}: ${warning.message}${warning.suggestion ? ` (${warning.suggestion})` : ''}`);
  });

  let connectivityTime = 0;
  if (configValidation.result.isValid) {
    const connectivityEnd = benchmark.start('connectivity-test');
    const connectivityTest = await testTrelloConnectivity(key, token, boardId);
    connectivityEnd();

    if (!connectivityTest.success) {
      errors.push(`Trello API connectivity test failed: ${connectivityTest.error}`);
    }
  }

  const inputDir = args.mdInputDir
    ? (path.isAbsolute(args.mdInputDir) ? args.mdInputDir : path.resolve(projectRoot, args.mdInputDir))
    : path.resolve(projectRoot, "trello");

  const outputDir = args.mdOutputDir
    ? (path.isAbsolute(args.mdOutputDir) ? args.mdOutputDir : path.resolve(projectRoot, args.mdOutputDir))
    : path.resolve(projectRoot, "trello");

  const dirEnd = benchmark.start('directory-validation');
  const inputDirValidation = await validateAndEnsureDirectory(inputDir);
  if (!inputDirValidation.success) {
    errors.push(`Input directory validation failed: ${inputDirValidation.error}`);
  }

  const outputDirValidation = await validateAndEnsureDirectory(outputDir);
  if (!outputDirValidation.success) {
    errors.push(`Output directory validation failed: ${outputDirValidation.error}`);
  }
  dirEnd();

  if (inputDirValidation.created) {
    warnings.push(`Created input directory: ${inputDir}`);
  }
  if (outputDirValidation.created) {
    warnings.push(`Created output directory: ${outputDir}`);
  }

  overallEnd();

  const summary = benchmark.getSummary();
  const metrics = {
    validationTime: configValidation.metrics.validationTime,
    directoryCheckTime: summary.totalOperations > 0 ? summary.averageDuration : 0,
    connectivityTime,
    totalTime: summary.totalOperations > 0 ? summary.averageDuration * summary.totalOperations : 0
  };

  if (args.verbose && metrics.totalTime > 100) {
    warnings.push(`Performance notice: Validation took ${metrics.totalTime.toFixed(2)}ms`);
  }

  return {
    success: errors.length === 0,
    errors,
    warnings,
    metrics
  };
}

async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');

  console.log("Validating Trello configuration...\n");

  try {
    const result = await validateConfig({ verbose });

    if (result.warnings.length > 0) {
      console.log("Warnings:");
      result.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
      console.log();
    }

    if (result.metrics && verbose) {
      console.log("Performance Metrics:");
      console.log(`  Validation time: ${result.metrics.validationTime.toFixed(2)}ms`);
      console.log(`  Directory check time: ${result.metrics.directoryCheckTime.toFixed(2)}ms`);
      console.log(`  Connectivity test time: ${result.metrics.connectivityTime.toFixed(2)}ms`);
      console.log(`  Total time: ${result.metrics.totalTime.toFixed(2)}ms`);
      console.log();
    }

    if (result.success) {
      console.log("✅ Configuration validation passed!");
      console.log("All required parameters are valid and Trello API is accessible.");
      if (result.metrics && result.metrics.totalTime < 100) {
        console.log(`🚀 Validation completed in ${result.metrics.totalTime.toFixed(2)}ms`);
      }
      process.exit(0);
    } else {
      console.log("❌ Configuration validation failed:");
      result.errors.forEach(error => console.log(`  ❌ ${error}`));
      console.log("\nPlease fix the above issues and try again.");
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Validation failed with error:", error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}