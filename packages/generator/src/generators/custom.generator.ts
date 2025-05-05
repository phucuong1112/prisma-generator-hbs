import { DMMF, GeneratorOptions } from "@prisma/generator-helper";
import { BaseGenerator } from "./base.generator";
import { logger } from '@prisma/sdk'
import * as path from "path";
import { toKebabCase, toPascalCase } from "../utils/string.util";
import fs from "fs";
import { toCamelCase } from "../utils/string.util";
import { generateFile } from "../utils/templates";
import { registerHandlebarsHelpers, registerHandlebarCustomHelpers } from '../helpers/hbs.helper';

export class CustomGenerator extends BaseGenerator {
  constructor(protected options: GeneratorOptions, templateName: string = 'custom') {
    super(options, templateName)
  }

  async generate(): Promise<void> {
    logger.info(`* ${this.templateName}: Generating custom API`)

    // Process configuration
    let filteredModels: string[] = ['*'];
    
    if (typeof(this.options.generator.config.filteredModels) === 'string') {
      filteredModels = ((this.options.generator.config.filteredModels || '*') as string).split(',').map(model => model.trim());
    } else if (Array.isArray(this.options.generator.config.filteredModels)) {
      filteredModels = this.options.generator.config.filteredModels;
    }

    // Register Handlebars helpers
    registerHandlebarsHelpers();
    // Register partials from the helpers directory
    registerHandlebarCustomHelpers(this.getTemplateFolder());

    const isGenerateAll = filteredModels.includes('*');
    const filterModelByRegex = filteredModels.filter(model => model.startsWith('/') && model.endsWith('/'));
    const filterModelByName = filteredModels.filter(model => !model.startsWith('/') && !model.endsWith('/'));
    for await (const modelInfo of this.options.dmmf.datamodel.models) {
      const regexMatches = filterModelByRegex.some(model => {
        const patternWithoutSlashes = model.slice(1, -1);
        try {
          const regex = new RegExp(patternWithoutSlashes);
          const matches = regex.test(modelInfo.name);
          return matches;
        } catch (error) {
          return false;
        }
      });
      
      if (isGenerateAll || filterModelByName.includes(modelInfo.name) || regexMatches) {
        this.generateModel(modelInfo);
      }
    }
  }

  async generateModel(modelInfo: DMMF.Model) {

    const generatorFnFile = this.options.generator.config.generatorFn as string || 'generator.js';

    let templateFolder = this.getTemplateFolder();

    const generatorFnFilePath = path.join(templateFolder, generatorFnFile);
    // check the generatorFnFile exists
    if (!fs.existsSync(generatorFnFilePath)) {
      logger.error(`Generator function file ${generatorFnFile} not found in template folder ${templateFolder}`);
      return;
    }
    // import generatorFnFile and call function to get template definition
    const generatorFn = require(generatorFnFilePath);
    const templateDefinition: boolean | {
      templateFile: string,
      destFile: string,
      data: Record<string, unknown>
    }[] = generatorFn.getTemplates(this.options, modelInfo);

    if (!templateDefinition) {
      logger.info(`  - Template definition not found for model ${modelInfo.name}`);
      return;
    }

    logger.info('  - Continue generating files for model: ', modelInfo.name);

    const promises = [];
    if (Array.isArray(templateDefinition)) {
      for (const template of templateDefinition) {
        const templateFile = template.templateFile;
        const destFile = Array.isArray(template.destFile) ? template.destFile : [template.destFile];
        const data = template.data || {};
        data.modelInfo = modelInfo;

        const destFilePath = path.join(this.options.generator.output?.value!, ...destFile);
        // Create module folder if not exists
        const destFileDir = path.dirname(destFilePath);
        fs.mkdirSync(destFileDir, { recursive: true });
        // Generate file
        promises.push(generateFile(
          templateFolder,
          templateFile,
          destFilePath,
          data
        ));
      }
    }

    await Promise.all(promises);
  }
}
