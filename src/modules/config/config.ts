import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer"; // ✅ Correct import

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || ".", ".gitsage");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

export async function getApiKey(): Promise<string> {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        if (config.apiKey) return config.apiKey;
    }

    // ✅ Correct usage of inquirer.prompt()
    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
            type: "password",
            name: "apiKey",
            message: "Enter your OpenAI API key:",
            mask: "*",
        },
    ]);

    // Save the key for future use
    saveApiKey(apiKey);
    return apiKey;
}

function saveApiKey(apiKey: string) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });

    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ apiKey }, null, 2), { encoding: "utf-8" });
}
