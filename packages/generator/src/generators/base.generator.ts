import { GeneratorOptions } from "@prisma/generator-helper";
import * as path from 'path';

export class BaseGenerator {
  constructor(protected options: GeneratorOptions, protected templateName: string) {
  }

  async generate(): Promise<void> {
    throw new Error('Method not implemented')
  }

  getTemplateFolder(): string {
    // Get template folder
    let templateFolder = this.options.generator.config.templateDir ? 
      path.join(this.options.generator.output?.value!, this.options.generator.config.templateDir as string, this.templateName) :
      path.join(__dirname, '..', 'templates', this.templateName);
    return templateFolder;
  }
}