import * as Handlebars from 'handlebars'
import * as fs from 'fs'
import * as path from 'path'
import { logger } from '@prisma/sdk'

/**
 * Generate a file from a Handlebars template with proper partial support
 * @param templateFolder - Absolute path to the template folder
 * @param templateFile - Relative path to the template file within the template folder
 * @param outputFile - Absolute path to the output file
 * @param data - Data to pass to the template
 */
export async function generateFile(
  templateFolder: string,
  templateFile: string,
  outputFile: string,
  data: any,
): Promise<void> {
  logger.info(`  - Generating file: ${templateFile} to ${outputFile}`)
  // Get folder of output file and create the folder recursive when it it not exist
  const outputFolder = path.dirname(outputFile)
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true })
  }

  try {
    // Read the template content
    const templatePath = path.join(templateFolder, templateFile)
    const template = fs.readFileSync(templatePath, 'utf8')

    // Compile and render the template with the provided data
    const compiledTemplate = Handlebars.compile(template)
    const renderedTemplate = compiledTemplate(data)

    // Write the rendered template to the output file
    fs.writeFileSync(outputFile, renderedTemplate)
  } catch (error) {
    logger.error('Error rendering template:', error)
    throw error
  }
}
