import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper'
import { logger } from '@prisma/sdk'
import { GENERATOR_NAME } from './constants'
import { BaseGenerator } from './generators/base.generator'
import { CustomGenerator } from './generators/custom.generator'
import * as fs from 'fs'

const { version } = require('../package.json')

generatorHandler({
  onManifest() {
    logger.info(`${GENERATOR_NAME}:Registered`)
    return {
      version,
      defaultOutput: '../generated',
      prettyName: GENERATOR_NAME,
    }
  },
  onGenerate: async (options: GeneratorOptions) => {
    logger.info(`${GENERATOR_NAME}:onGenerate`)

    const template = options.generator.config.template as string || 'custom';

    const templateGenerator = new CustomGenerator(options, template);
    const templateFolder = templateGenerator.getTemplateFolder();

    if (!fs.existsSync(templateFolder)) {
      logger.info(`${GENERATOR_NAME}:Template folder not found: ${templateFolder}`);
      return;
    }
    await templateGenerator.generate();
  },
})

