import dotenv from "dotenv";
import path from "path";
import https from "https";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

const TRELLO_KEY = process.env.TRELLO_KEY || "";
const TRELLO_TOKEN = process.env.TRELLO_TOKEN || "";
const TRELLO_BOARD_ID = process.env.TRELLO_BOARD_ID || "";

async function fetchJson(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = "";
            res.on("data", (chunk) => data += chunk);
            res.on("end", () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on("error", reject);
    });
}

async function checkBoard() {
    try {
        console.log("Checking Trello board...\n");

        const boardUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        const board = await fetchJson(boardUrl);
        console.log(`Board Name: ${board.name}`);
        console.log(`Board ID: ${board.id}\n`);

        const listsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/lists?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        const lists = await fetchJson(listsUrl);
        console.log("Available Lists:");
        lists.forEach((list: any) => {
            console.log(`  - ${list.name} (ID: ${list.id})`);
        });
        console.log();

        const membersUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/members?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        const members = await fetchJson(membersUrl);
        console.log("Available Members:");
        members.forEach((member: any) => {
            console.log(`  - ${member.fullName} (username: ${member.username}, ID: ${member.id})`);
        });
        console.log();

        const labelsUrl = `https://api.trello.com/1/boards/${TRELLO_BOARD_ID}/labels?key=${TRELLO_KEY}&token=${TRELLO_TOKEN}`;
        const labels = await fetchJson(labelsUrl);
        console.log("Available Labels:");
        labels.forEach((label: any) => {
            console.log(`  - ${label.name || "(no name)"} (color: ${label.color}, ID: ${label.id})`);
        });

    } catch (error: any) {
        console.error("Error:", error.message || error);
    }
}

checkBoard();
