import fs from "fs/promises";
import path from "path";

export interface DirectoryValidationResult {
  exists: boolean;
  readable: boolean;
  writable: boolean;
  error?: string;
}

export interface DirectoryCreationResult {
  created: boolean;
  existed: boolean;
  error?: string;
}

export async function ensureDirectory(dirPath: string): Promise<DirectoryCreationResult> {
  try {
    const stats = await fs.stat(dirPath);
    if (stats.isDirectory()) {
      return { created: false, existed: true };
    } else {
      return { 
        created: false, 
        existed: false, 
        error: `Path exists but is not a directory: ${dirPath}` 
      };
    }
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      try {
        await fs.mkdir(dirPath, { recursive: true });
        return { created: true, existed: false };
      } catch (createError: any) {
        return { 
          created: false, 
          existed: false, 
          error: `Failed to create directory: ${createError.message}` 
        };
      }
    } else {
      return { 
        created: false, 
        existed: false, 
        error: `Failed to check directory: ${error.message}` 
      };
    }
  }
}

export async function validateDirectoryAccess(dirPath: string): Promise<DirectoryValidationResult> {
  try {
    const stats = await fs.stat(dirPath);
    if (!stats.isDirectory()) {
      return {
        exists: true,
        readable: false,
        writable: false,
        error: `Path exists but is not a directory: ${dirPath}`
      };
    }

    let readable = false;
    let writable = false;

    try {
      await fs.access(dirPath, fs.constants.R_OK);
      readable = true;
    } catch {
      readable = false;
    }

    try {
      await fs.access(dirPath, fs.constants.W_OK);
      writable = true;
    } catch {
      writable = false;
    }

    return {
      exists: true,
      readable,
      writable
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        readable: false,
        writable: false,
        error: `Directory does not exist: ${dirPath}`
      };
    } else {
      return {
        exists: false,
        readable: false,
        writable: false,
        error: `Failed to access directory: ${error.message}`
      };
    }
  }
}

export async function validateAndEnsureDirectory(dirPath: string): Promise<{
  success: boolean;
  created: boolean;
  validation: DirectoryValidationResult;
  error?: string;
}> {
  const absolutePath = path.resolve(dirPath);
  
  const creationResult = await ensureDirectory(absolutePath);
  if (creationResult.error) {
    return {
      success: false,
      created: false,
      validation: {
        exists: false,
        readable: false,
        writable: false,
        error: creationResult.error
      },
      error: creationResult.error
    };
  }

  const validation = await validateDirectoryAccess(absolutePath);
  
  if (!validation.readable || !validation.writable) {
    const permissions = [];
    if (!validation.readable) permissions.push('read');
    if (!validation.writable) permissions.push('write');
    
    const error = `Directory lacks ${permissions.join(' and ')} permissions: ${absolutePath}`;
    return {
      success: false,
      created: creationResult.created,
      validation: { ...validation, error },
      error
    };
  }

  return {
    success: true,
    created: creationResult.created,
    validation
  };
}