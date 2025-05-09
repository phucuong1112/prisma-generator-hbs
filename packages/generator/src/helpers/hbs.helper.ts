import * as Handlebars from 'handlebars'
import { toKebabCase, toPascalCase, toCamelCase } from '../utils/string.util'
import { logger } from '@prisma/sdk'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Register all Handlebars helpers
 */
export function registerHandlebarsHelpers(): void {
  // Register comparison helpers
  Handlebars.registerHelper('eq', function (a, b) {
    return a === b
  })

  Handlebars.registerHelper('or', function (...args: any[]) {
    // Remove the options object which is always the last argument
    const options = args.pop()
    // Check if any of the remaining arguments is truthy
    return args.some(Boolean)
  })

  Handlebars.registerHelper('and', function (...args: any[]) {
    // Remove the options object which is always the last argument
    const options = args.pop()
    // Check if all of the remaining arguments are truthy
    return args.every(Boolean)
  })

  Handlebars.registerHelper('not', function (value) {
    return !value
  })

  Handlebars.registerHelper(
    'includes',
    function (list: string | any[], item: any) {
      if (typeof list === 'string') {
        return list.split(',').includes(item)
      }
      return Array.isArray(list) && list.includes(item)
    },
  )

  // Register string case helpers
  Handlebars.registerHelper('toKebab', function (str: string) {
    return toKebabCase(str)
  })
  Handlebars.registerHelper('toPascal', function (str: string) {
    return toPascalCase(str)
  })
  Handlebars.registerHelper('toCamel', function (str: string) {
    return toCamelCase(str)
  })
  Handlebars.registerHelper('toUpper', function (str: string) {
    return str.toUpperCase()
  })

  // Register array helpers
  Handlebars.registerHelper(
    'find',
    function (
      array: any[],
      propertyPath: string | ((item: any) => boolean),
      value?: any,
    ) {
      if (!Array.isArray(array)) return null
      return array.find((item) => {
        if (typeof propertyPath === 'function') {
          return propertyPath(item)
        }
        return item[propertyPath as string] === value
      })
    },
  )

  // Register Zod schema generation helpers
  Handlebars.registerHelper(
    'generateZodSchemaProperties',
    function (modelInfo, modelClassName) {
      if (!modelInfo || !modelInfo.fields) return ''

      const excludedFields = [
        'id',
        'createdAt',
        'updatedAt',
        'deletedAt',
        'createdBy',
        'updatedBy',
      ]
      const fieldsToInclude = modelInfo.fields.filter((field: any) => {
        // Exclude relation fields (kind === 'object')
        if (field.kind === 'object') return false

        // Exclude standard excluded fields
        if (excludedFields.includes(field.name)) return false

        return true
      })

      return fieldsToInclude
        .map((field: any, index: number) => {
          let result = `  ${field.name}: `

          // Determine the Zod type based on the field type
          switch (field.type) {
            case 'String':
              result += 'z.string()'

              // Add constraints based on native type if available
              if (
                field.nativeType &&
                field.nativeType[0] === 'VarChar' &&
                field.nativeType[1] &&
                field.nativeType[1][0]
              ) {
                result += `.max(${field.nativeType[1][0]})`
              }

              // Add min constraint for required string fields (reasonable default)
              if (field.isRequired && !field.isId) {
                result += '.min(2)'
              }
              break

            case 'Int':
            case 'BigInt':
              result += 'z.number().int()'
              break

            case 'Float':
            case 'Decimal':
              result += 'z.number()'
              break

            case 'Boolean':
              result += 'z.boolean()'
              break

            case 'DateTime':
              result += 'z.date()'
              break

            case 'Json':
              result += 'z.record(z.any())'
              break

            default:
              // Default to any for unknown types
              result += 'z.any()'
          }

          // Handle nullable and optional fields
          if (!field.isRequired) {
            result += '.nullable().optional()'
          }

          // Add description for OpenAPI
          result += `\n    .describe('${modelClassName} ${field.name}')`

          // Add comma if not the last field
          if (index < fieldsToInclude.length - 1) {
            result += ','
          }

          return result
        })
        .join('\n')
    },
  )

  Handlebars.registerHelper(
    'generateResponseSchemaProperties',
    function (modelInfo, modelClassName) {
      // Add standard fields that should be in every response
      const standardFields = [
        {
          name: 'id',
          type: 'String',
          description: `${modelClassName} ID`,
        },
        {
          name: 'createdAt',
          type: 'DateTime',
          description: 'Creation date',
        },
        {
          name: 'updatedAt',
          type: 'DateTime',
          description: 'Last update date',
        },
      ]

      return standardFields
        .map((field, index) => {
          let result = `    ${field.name}: `

          // Determine the Zod type based on the field type
          switch (field.type) {
            case 'String':
              result += 'z.string()'
              break
            case 'DateTime':
              result += 'z.date()'
              break
            default:
              result += 'z.any()'
          }

          // Add description for OpenAPI
          result += `\n      .describe('${field.description}')`

          // Add comma if not the last field
          if (index < standardFields.length - 1) {
            result += ','
          }

          return result
        })
        .join('\n')
    },
  )

  Handlebars.registerHelper(
    'generateSearchSchemaProperties',
    function (modelInfo, modelClassName, modelVarName) {
      if (!modelInfo || !modelInfo.fields) return ''

      // Determine which fields should be searchable
      const searchableFields = modelInfo.fields.filter((field: any) => {
        // Only include scalar fields (not object relations)
        if (field.kind !== 'scalar') return false

        // Exclude standard metadata fields
        const metadataFields = [
          'createdAt',
          'updatedAt',
          'deletedAt',
          'createdBy',
          'updatedBy',
        ]
        if (metadataFields.includes(field.name)) return false

        // Include string fields that might be searchable
        if (field.type === 'String') {
          // Prioritize unique fields or fields with meaningful names
          const meaningfulFields = [
            'name',
            'title',
            'slug',
            'email',
            'username',
            'code',
            'reference',
            'description',
          ]
          if (
            field.isUnique ||
            meaningfulFields.some((name) =>
              field.name.toLowerCase().includes(name.toLowerCase()),
            )
          ) {
            return true
          }
        }

        // Include other fields that might be useful for filtering
        if (
          ['status', 'type', 'category'].some((name) =>
            field.name.toLowerCase().includes(name.toLowerCase()),
          )
        ) {
          return true
        }

        if (field.type === 'Boolean') {
          return true
        }

        // Include date fields for range filtering
        if (
          field.type === 'DateTime' &&
          !['createdAt', 'updatedAt', 'deletedAt'].includes(field.name)
        ) {
          return true
        }

        return false
      })

      return searchableFields
        .map((field: any, index: number) => {
          let result = `  ${field.name}: `

          // Determine the Zod type based on the field type
          switch (field.type) {
            case 'String':
              result += 'z.string()'
              break
            case 'Int':
            case 'BigInt':
              result += 'z.number().int()'
              break
            case 'Float':
            case 'Decimal':
              result += 'z.number()'
              break
            case 'Boolean':
              result += 'z.boolean()'
              break
            case 'DateTime':
              result += 'z.date()'
              break
            default:
              result += 'z.any()'
          }

          // Make search fields optional
          result += '\n    .optional()'

          // Add description for OpenAPI
          result += `\n    .describe("Search by ${modelClassName}'s ${field.name}")`

          // Add comma if not the last field
          if (index < searchableFields.length - 1) {
            result += ','
          }

          return result
        })
        .join('\n')
    },
  )
}

export function registerHandlebarCustomHelpers(templateFolder: string) {
  logger.info('* Registering custom Handlebars helpers')
  const helpersDir = path.join(templateFolder, 'helpers')
  if (fs.existsSync(helpersDir)) {
    const helperFiles = fs.readdirSync(helpersDir)
    helperFiles.forEach((file) => {
      if (file.endsWith('.hbs')) {
        const partialName = path.basename(file, '.hbs')
        const partialContent = fs.readFileSync(
          path.join(helpersDir, file),
          'utf8',
        )
        Handlebars.registerPartial(partialName, partialContent)
        logger.info(`  - Registered partial: ${partialName}`)
      } else if (file.endsWith('.js')) {
        // Import the helper file and register it with the name is the function name
        const helperName = path.basename(file, '.js')
        // Dynamically import the helper file
        const helperModule = require(path.join(helpersDir, file))

        // Register each method in the module as a separate helper
        if (typeof helperModule === 'object') {
          // If it's an object with multiple methods
          Object.keys(helperModule).forEach((methodName) => {
            if (typeof helperModule[methodName] === 'function') {
              Handlebars.registerHelper(methodName, helperModule[methodName])
              logger.info(`  - Registered helper: ${methodName}`)
            }
          })
        } else if (typeof helperModule === 'function') {
          // If it's a single function export
          Handlebars.registerHelper(helperName, helperModule)
          logger.info(`  - Registered helper: ${helperName}`)
        }
      } else if (file.endsWith('.ts')) {
        // Import the helper file and register it with the name is the function name
        const helperName = path.basename(file, '.ts')
        // Dynamically import the helper file
        const helperModule = require(path.join(helpersDir, file))

        // Register each method in the module as a separate helper
        if (typeof helperModule === 'object') {
          // If it's an object with multiple methods
          Object.keys(helperModule).forEach((methodName) => {
            if (typeof helperModule[methodName] === 'function') {
              Handlebars.registerHelper(methodName, helperModule[methodName])
              logger.info(`  - Registered helper: ${methodName}`)
            }
          })
        } else if (typeof helperModule === 'function') {
          // If it's a single function export
          Handlebars.registerHelper(helperName, helperModule)
          logger.info(`  - Registered helper: ${helperName}`)
        }
      }
    })
  }
}
