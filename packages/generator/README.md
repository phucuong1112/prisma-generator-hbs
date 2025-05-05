# prisma-generator-hbs

This package is designed to generate output from your Prisma schema using Handlebars templates (https://handlebarsjs.com/).

## Example Schema

```
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator crud_api {
  provider       = "npx prisma-generator-hbs"
  output         = "../generated/crud-api"
  template       = "crud-api"
  templateDir    = "../../templates"
  filteredModels = "*"
  genUnitTest    = true
}

model User {
  id             String            @id @default(ulid()) @db.VarChar(26)
  firstName      String            @db.VarChar(128)
  lastName       String            @db.VarChar(128)
  email          String            @unique @db.VarChar(256)
  avatar         String?           @db.VarChar(256)
  status         String            @db.VarChar(16)
  lastLogin      DateTime?         @db.Timestamptz
  lockTime       DateTime?         @db.Timestamptz
  password       String            @db.VarChar(64)
  emailVerified  Boolean           @default(false)
  createdAt      DateTime          @default(now())
  updatedAt      DateTime          @default(now()) @updatedAt
  deletedAt      DateTime?         @db.Timestamptz
  createdBy      String?           @db.VarChar(26)
  updatedBy      String?           @db.VarChar(26)

  @@map("users")
}
```

## Setting up the Generator

Configure the generator block in your `schema.prisma` file as follows:

```
generator crud_api {
  provider      = "npx prisma-generator-hbs"
  output        = "../generated/crud-api"
  template      = "crud-api"
  templateDir   = "../../templates"
  // filteredModels = "*"
  // filteredModels = "User,Role"
  filteredModels = ["User", "Role", "Permission"]
  prismaClient    = "@prisma/client"
}
```

Here's a breakdown of the configuration options:

- `provider` (required): This must always be set to `"npx prisma-generator-hbs"`.
- `output` (required): This specifies the directory where the generated files will be placed.
- `templateDir` (required): This is the path to the directory containing your Handlebars templates. **Important:** This path is relative to the `output` directory.
- `template` (required): This is the name of the template directory (a subdirectory within the `templateDir`) that will be used for generation.
- `filteredModels` (optional): This option allows you to specify which models from your Prisma schema should be processed by the generator. You can define it in the following ways:
  - `` `*` ``: (Default) Processes all models defined in your schema.
  - `` `filteredModels = "User,Role"` ``: A comma-separated string listing the names of the models to be processed.
  - `` `filteredModels = ["User", "Role", "Permission"]` ``: An array of strings, where each string is the name of a model to be processed.
  - `` `filteredModels = ["/User.+/", "Role", "Permission"]` ``: You can also use regular expressions (enclosed in `/`) to match model names.

## Template folder

```
.
└── crud-api
    ├── controller.spec.ts.hbs
    ├── controller.ts.hbs
    ├── dto
    │   └── schema.ts.hbs
    ├── generator.js
    ├── helpers
    │   ├── helper-1.js
    │   └── helper-2.ts
    ├── module.ts.hbs
    ├── repositories
    │   ├── repository.spec.ts.hbs
    │   └── repository.ts.hbs
    ├── service.spec.ts.hbs
    └── service.ts.hbs
```

Within the template directory, in addition to the `.hbs` files, you also need to define the following:

- `generator.js`: This file should export a list of templates that need to be rendered.

```javascript
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
```


- `helpers`: This directory should contain your Handlebars helper definitions. These can be in `.ts`, `.js`, or even `.hbs` files.

```javascript
// js file
module.exports = {
  getRandomInt1: (min, max) => {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
```

```javascript
// ts file
export function getRandomInt2(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
```
