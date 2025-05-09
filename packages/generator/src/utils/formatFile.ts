import prettier from 'prettier'
import path from 'path'
import fs from 'fs'

export function createPrettierConfig(
  options: prettier.Options,
  folderPath: string,
) {
  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true })
  }
  // Exit if prettier config file already exists
  const prettierConfigPath = path.join(folderPath, '.prettierrc')
  if (fs.existsSync(prettierConfigPath)) {
    console.log('Prettier config file already exists')
    return options
  }

  const defaultConfig = {
    singleQuote: true,
    trailingComma: 'none',
    semi: false,
    printWidth: 80,
    tabWidth: 2,
    useTabs: false,
    bracketSpacing: true,
  }
  const config = { ...defaultConfig, ...options }
  // Write prettier config file
  fs.writeFileSync(prettierConfigPath, JSON.stringify(config, null, 2))
  console.log('Prettier config file created at', prettierConfigPath)
}

export async function formatFolder(folderPath: string): Promise<void> {
  // Exit if folder doesn't exist
  if (!fs.existsSync(folderPath)) {
    console.log('Folder does not exist')
    return
  }
  // Run `npx prettier <folderPath> --write` command
  const command = `npx -y prettier ${folderPath} --write`
  const exec = require('child_process').exec
  console.log(command)

  return new Promise((resolve, reject) => {
    exec(command, (error: Error, stdout: string, stderr: string) => {
      if (error) {
        console.error(`Error: `, error)
        return reject(error)
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`)
        return reject(new Error(stderr))
      }
      console.log('stdout', stdout)
      resolve()
    })
  });
}
