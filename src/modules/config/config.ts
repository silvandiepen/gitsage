import * as fs from "fs";
import * as path from "path";
import inquirer from "inquirer";
import { execSync } from "child_process";

const CONFIG_DIR = path.join(process.env.HOME || process.env.USERPROFILE || ".", ".gitsage");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

interface Config {
    apiKey: string;
    aiProvider: string;
    gitName: string;
    gitEmail: string;
}

const defaultConfig: Config = {
    apiKey: "",
    aiProvider: "OpenAI",
    gitName: "",
    gitEmail: ""
};

export async function getConfig(): Promise<Config> {
    if (fs.existsSync(CONFIG_FILE)) {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf-8"));
        return { ...defaultConfig, ...config };
    }
    return defaultConfig;
}

export async function getApiKey(): Promise<string> {
    const config = await getConfig();
    if (config.apiKey) return config.apiKey;

    const { apiKey } = await inquirer.prompt<{ apiKey: string }>([
        {
            type: "password",
            name: "apiKey",
            message: "Enter your OpenAI API key:",
            mask: "*",
        },
    ]);

    await saveConfig({ ...config, apiKey });
    return apiKey;
}

async function saveConfig(config: Partial<Config>) {
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    const currentConfig = await getConfig();
    const newConfig = { ...currentConfig, ...config };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(newConfig, null, 2), { encoding: "utf-8" });
}

export async function configureSettings(): Promise<void> {
    const currentConfig = await getConfig();
    const gitConfig = getGitConfig();

    const { action } = await inquirer.prompt([
        {
            type: "list",
            name: "action",
            message: "What would you like to do?",
            choices: [
                { name: "View current settings", value: "view" },
                { name: "Edit settings", value: "edit" },
            ],
        },
    ]);

    if (action === "view") {
        console.log("\nCurrent Settings:");
        console.log("AI Provider:", currentConfig.aiProvider);
        console.log("OpenAI API Key:", currentConfig.apiKey ? "*****" : "Not set");
        console.log("Git Name:", currentConfig.gitName || gitConfig.name || "Not set");
        console.log("Git Email:", currentConfig.gitEmail || gitConfig.email || "Not set");
        return;
    }

    const { field } = await inquirer.prompt([
        {
            type: "list",
            name: "field",
            message: "Which setting would you like to edit?",
            choices: [
                { name: "AI Provider", value: "aiProvider" },
                { name: "OpenAI API Key", value: "apiKey" },
                { name: "Git Name", value: "gitName" },
                { name: "Git Email", value: "gitEmail" },
            ],
        },
    ]);

    let value = "";
    if (field === "aiProvider") {
        const { provider } = await inquirer.prompt([
            {
                type: "list",
                name: "provider",
                message: "Select AI Provider:",
                choices: ["OpenAI"],
                default: currentConfig.aiProvider,
            },
        ]);
        value = provider;
    } else if (field === "apiKey") {
        const { action } = await inquirer.prompt([
            {
                type: "list",
                name: "action",
                message: `Current API Key: ${currentConfig.apiKey ? "sk-****" + currentConfig.apiKey.slice(-4) : "Not set"}`,
                choices: [
                    { name: "Keep current API key", value: "keep" },
                    { name: "Enter new API key", value: "new" }
                ]
            }
        ]);

        if (action === "new") {
            const { key } = await inquirer.prompt([
                {
                    type: "password",
                    name: "key",
                    message: "Enter your new OpenAI API key:",
                    mask: "*",
                }
            ]);
            value = key;
        } else {
            value = currentConfig.apiKey;
        }
    } else {
        const { input } = await inquirer.prompt([
            {
                type: "input",
                name: "input",
                message: `Enter your ${field === "gitName" ? "Git name" : "Git email"}:`,
                default: field === "gitName" ? currentConfig.gitName || gitConfig.name : currentConfig.gitEmail || gitConfig.email,
            },
        ]);
        value = input;

        // Update git config
        if (field === "gitName") {
            execSync(`git config --global user.name "${value}"`);
        } else if (field === "gitEmail") {
            execSync(`git config --global user.email "${value}"`);
        }
    }

    await saveConfig({ [field]: value });
    console.log("\nSettings updated successfully!");
}

function getGitConfig() {
    try {
        const name = execSync('git config --global user.name').toString().trim();
        const email = execSync('git config --global user.email').toString().trim();
        return { name, email };
    } catch (error) {
        return { name: "", email: "" };
    }
}
