import type { PromptObject } from "prompts"

import os from "os"
import path from "path"
import { fileURLToPath } from "url"

import chalk from "chalk"
import dotenv from "dotenv"
import figlet from "figlet"
import fs from "fs-extra"
import prompts from "prompts"
dotenv.config()

// Binance Gold Color
const yellow = chalk.hex("#F0B90B")

// ESModule __dirname workaround
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Cancel handler
const onCancel = () => {
  console.log(chalk.red("\n❌ Configuration cancelled by user (Ctrl+C or ESC). Exiting..."))
  process.exit(0)
}

// Show Banner
const showBanner = () => {
  const banner = figlet.textSync("Binance MCP ", { font: "Big" })
  console.log(yellow(banner))
  console.log(yellow("🚀 Welcome to the Binance MCP Configurator\n"))
}

// User Input Types
interface UserInputs {
  BINANCE_API_KEY: string
  BINANCE_API_SECRET: string
  BINANCE_TESTNET: boolean
}

// Ask for credentials
const getInputs = async (): Promise<UserInputs> => {
  const questions: PromptObject[] = [
    {
      type: "password",
      name: "BINANCE_API_KEY",
      message: "🔑Enter your BINANCE API KEY:",
      validate: (val: string) => (val.trim() === "" ? "BINANCE API KEY is required!" : true),
    },
    {
      type: "password",
      name: "BINANCE_API_SECRET",
      message: " 🔐 Enter your BINANCE API SECRET:",
      validate: (val: string) => (val.trim() === "" ? "BINANCE API SECRET is required!" : true),
    },
    {
      type: "confirm",
      name: "BINANCE_TESTNET",
      message: "🧪 Use Binance Spot Test Network? (testnet.binance.vision)",
      initial: false,
    },
  ]

  return (await prompts(questions, { onCancel })) as UserInputs
}

// Generate .env file
const generateEnvFile = async (
  BINANCE_API_KEY: string,
  BINANCE_API_SECRET: string,
  BINANCE_TESTNET: boolean,
): Promise<void> => {
  const envContent = `
BINANCE_API_KEY=${BINANCE_API_KEY}
BINANCE_API_SECRET=${BINANCE_API_SECRET}
BINANCE_TESTNET=${BINANCE_TESTNET}
`.trim()

  await fs.writeFile(".env", envContent)
  console.log(yellow("✅ .env file generated."))
}

// Generate config object
const generateConfig = async (
  BINANCE_API_KEY: string,
  BINANCE_API_SECRET: string,
  BINANCE_TESTNET: boolean,
): Promise<any> => {
  const indexPath = path.resolve(__dirname, "..", "build", "index.js") // one level up from cli/

  const env: Record<string, string> = {
    BINANCE_API_KEY: BINANCE_API_KEY,
    BINANCE_API_SECRET: BINANCE_API_SECRET,
  }

  if (BINANCE_TESTNET) {
    env.BINANCE_TESTNET = "true"
  }

  return {
    "binance-mcp": {
      command: "bun",
      args: ["run", indexPath],
      env,
      disabled: false,
      autoApprove: [],
    },
  }
}

// Configure Claude Desktop
const configureClaude = async (config: object): Promise<boolean> => {
  const userHome = os.homedir()
  let claudePath
  const platform = os.platform()
  if (platform == "darwin") {
    claudePath = path.join(
      userHome,
      "Library/Application Support/Claude/claude_desktop_config.json",
    )
  } else if (platform == "win32") {
    claudePath = path.join(userHome, "AppData", "Roaming", "Claude", "claude_desktop_config.json")
  } else {
    console.log(chalk.red("❌ Unsupported platform."))

    return false
  }

  if (!fs.existsSync(claudePath)) {
    console.log(
      chalk.yellow(
        "⚠️ Claude config file not found. Creating a new one with default configuration.",
      ),
    )
    // Create a default configuration object
    const defaultConfig = {
      mcpServers: {},
    }
    // Write the default configuration to the file
    await fs.writeJSON(claudePath, defaultConfig, { spaces: 2 })
  }

  const jsonData = fs.readFileSync(claudePath, "utf8")
  const data = JSON.parse(jsonData)

  data.mcpServers = {
    ...data.mcpServers,
    ...config,
  }

  await fs.writeJSON(claudePath, data, { spaces: 2 })
  console.log(
    yellow(
      "✅ Binance MCP configured for Claude Desktop. Please RESTART your Claude to enjoy it 🎉",
    ),
  )

  return true
}

// Save fallback config file
const saveFallbackConfig = async (config: object): Promise<void> => {
  await fs.writeJSON("config.json", config, { spaces: 2 })
  console.log(yellow("📁 Saved config.json in root project folder."))
}

// Main logic
const init = async () => {
  showBanner()

  const { BINANCE_API_KEY, BINANCE_API_SECRET, BINANCE_TESTNET } = await getInputs()

  await generateEnvFile(BINANCE_API_KEY, BINANCE_API_SECRET, BINANCE_TESTNET)

  if (BINANCE_TESTNET) {
    console.log(
      yellow(
        "🧪 Testnet mode enabled — API calls will go to testnet.binance.vision. " +
          "Only /api endpoints (spot trading & market data) are available.",
      ),
    )
  }

  const config = await generateConfig(BINANCE_API_KEY, BINANCE_API_SECRET, BINANCE_TESTNET)

  const { setupClaude } = await prompts(
    {
      type: "confirm",
      name: "setupClaude",
      message: "🧠 Do you want to configure in Claude Desktop?",
      initial: true,
    },
    { onCancel },
  )

  if (setupClaude) {
    const success = await configureClaude(config)
    if (!success) {
      await saveFallbackConfig(config)
    }
  } else {
    await saveFallbackConfig(config)
  }
}

init()
