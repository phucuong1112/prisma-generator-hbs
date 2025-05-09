function toKebabCase (str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
}

function toPascalCase(str) {
  return str
    .replace(/(\w)(\w*)/g, (_, first, rest) => first.toUpperCase() + rest.toLowerCase())
    .replace(/[-_\s]+(\w)/g, (_, char) => char.toUpperCase());
}

function toCamelCase(str) {
  return str
    .replace(/([-_ ]\w)/g, (group) => group[1].toUpperCase())
    .replace(/^./, (match) => match.toLowerCase());
}

export function getTemplates(options, model) {
  try {
    const prismaClient = options.generator.config.prismaClient || '@prisma/client';
    const moduleName = toKebabCase(model.dbName ?? model.name);
    const moduleFolder = moduleName;
    const modelClassName = model.name;
  
    const data = {
      prismaClient: prismaClient,
      moduleName: moduleName,
      moduleClassName: toPascalCase(moduleName),
      modelClassName: modelClassName,
      modelVarName: toCamelCase(modelClassName),
    }
  
    const templates = [
      {
        templateFile: 'module.ts.hbs',
        destFile: [moduleFolder, `${moduleName}.module.ts`],
        data,
      }, {
        templateFile: 'controller.ts.hbs',
        destFile: [moduleFolder, `${moduleName}.controller.ts`],
        data,
      }, {
        templateFile: 'service.ts.hbs',
        destFile: [moduleFolder, `${moduleName}.service.ts`],
        data,
      }, {
        templateFile: 'repositories/repository.ts.hbs',
        destFile: [moduleFolder, 'repositories', `${toKebabCase(model.name)}.repository.ts`],
        data,
      }, {
        templateFile: 'dto/schema.ts.hbs',
        destFile: [moduleFolder, 'dto', `${moduleName}.schema.ts`],
        data,
      },
    ];
  
    const genUnitTest = options.generator.config.genUnitTest === 'true' ? true : false;
  
    if (genUnitTest) {
      templates.push({
        templateFile: 'controller.spec.ts.hbs',
        destFile: [moduleFolder, `${moduleName}.controller.spec.ts`],
        data,
      });
      templates.push({
        templateFile: 'service.spec.ts.hbs',
        destFile: [moduleFolder, `${moduleName}.service.spec.ts`],
        data,
      });
      templates.push({
        templateFile: 'repositories/repository.spec.ts.hbs',
        destFile: [moduleFolder, 'repositories', `${toKebabCase(model.name)}.repository.spec.ts`],
        data,
      });
    }
  
    // return false;
    return templates;
  } catch (error) {
    console.error('Error in getTemplates:', error, model);
    return false;
  }
}

export function getAllTemplates(options, models) {
  console.log('getAllTemplates', options, models);
  const moduleFolder = 'all';

  const data = {};

  const templates = [
    {
      templateFile: 'language.yml.hbs',
      destFile: [moduleFolder, `language.yml`],
      data,
    }
  ];
  return templates;
}