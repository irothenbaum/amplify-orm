const {primitiveTypes} = require('../tools/types')
const Templatize = require('../tools/templatize')

class GeneratedModel {
  /**
   * @param {string} name
   * @param {Object<string, string>} fields // all the fields and their types as k:v pairs
   * @param {Object<string, Array<string>>} knownEnums // all the known enums as name:options paris
   */
  constructor(name, fields, knownEnums) {
    global.LOG(`Generating model ${name} with inputs:`, name, fields)

    this.name = name

    this.fields = fields
    this.allFields = Object.keys(fields)
    this.primitiveFields = []
    this.complexFields = []
    this.jsonFields = []

    const allPrimitiveTypes = primitiveTypes.concat(Object.keys(knownEnums))

    this.allFields.forEach(f => {
      // ignore if it's required or not when determining if its primitive
      allPrimitiveTypes.includes(fields[f].replace('!', '')) ? this.primitiveFields.push(f) : this.complexFields.push(f)
      if (fields[f] === 'AWSJSON') {
        this.jsonFields.push(f)
      }
    })

    /** @type {Array<QueryDefinition>} */
    this.queries = []

    const defaultFragmentName = `FragmentDefault`
    /** @type {Object<string, Array<FragmentField>>} */
    this.fragments = {
      // start off with the default fragment
      [defaultFragmentName]: this.primitiveFields,
    }

    /** @type {Object<string, function>} hook:function */
    this.hooks = {}
  }

  /**
   * @returns {string}
   */
  getCollectionName() {
    return this.name
  }

  /**
   * @param {QueryDefinition} def
   */
  addQueryDefinition(def) {
    global.LOG(`Adding ${def.queryName} (${def.type}) to ${this.name} model`)
    this.queries.push(def)
  }

  /**
   * @param {string} fragmentName
   * @param {Array<FragmentField>} definition
   */
  addFragment(fragmentName, definition) {
    global.LOG(
      `Adding ${fragmentName} to ${this.name} model, ${definition.length} fields`,
    )
    const invalidDefinitions = []
    definition.forEach(f => {
      if (typeof f === 'string') {
        if (!this.allFields.includes(f)) {
          invalidDefinitions.push(f)
        }
      } else {
        Object.keys(f).forEach(con => {
          if (!this.allFields.includes(con)) {
            invalidDefinitions.push(con)
          }
        })
      }
    })

    if (invalidDefinitions.length > 0) {
      throw new Error(
        `Unknown field(s) in fragment definition: [${invalidDefinitions.join(
          ', ',
        )}]`,
      )
    }

    this.fragments[fragmentName] = definition
  }

  /**
   * @param {string} hookName
   * @param {function} func
   */
  addHook(hookName, func) {
    // TODO: this won't work right I don't think ..
    //  (because we somehow need to stringify the function?)
    this.hooks[hookName] = func
  }

  /**
   * @param {Object<string, GeneratedModel>} allModels
   * @returns {Array<string>}
   */
  getFragmentDefinitions(allModels) {
    return Object.entries(this.fragments).map(
      ([fragmentName, fields]) => {
        // we return the fragmentConstant definition to be used in Collection
        return Templatize.render(
          'fragmentConstant.txt',
          {
            fragmentGQL: Templatize.render(
              'fragmentGQL.txt',
              {
                // the actual graphql fragment prepends the model name
                fragmentName: `${this.name}${fragmentName}`,
                modelName: this.name,
                fieldsList: fieldsListToString(this.name, fields, allModels),
              },
            ),
            collectionName: this.getCollectionName(),
            fragmentName: fragmentName,
          },
        )
      }
    )
  }
}

/**
 * @param {string} modelName
 * @param {Array<FragmentField> | { items: Array<FragmentField> }} fieldsList
 * @param {Object<string, GeneratedModel>} allModels
 * @param {number} depth
 * @returns {string}
 */
function fieldsListToString(modelName, fieldsList, allModels, depth = 1) {
  let spaces = getSpacesFromDepth(depth);

  global.LOG(`Building fields list with inputs:`, modelName, fieldsList, depth);

  if (Array.isArray(fieldsList)) {
    return fieldsList
      .map(singleField => {
        if (typeof singleField === 'string') {
          global.LOG(`Adding field "${singleField}" for "${modelName}"`);
          return `${spaces}${singleField}`;
        } else {
          const fieldNames = Object.keys(singleField);
          if (fieldNames.length === 0) {
            throw new Error('Missing field name(s) for complex FieldDefinition');
          }
          global.LOG(`Building complex fields for "${modelName}" with field names:`, fieldNames);

          return fieldNames
            .map(connectionName => {
              // if the model is not in allModels, it's because it was not included in the `collections` array in config
              const connectionType = allModels[modelName]?.fields[connectionName];

              if (!connectionType) {
                global.LOG(`Associated model "${modelName}" not included, skipping connection "${connectionName}"`);
                return null;
              }

              global.LOG(`Building complex field "${connectionName}" for "${modelName}" with type: ${connectionType}`);

              // if it starts with a [, then we need to build a sub query
              if (connectionType[0] === '[') {
                const connectionTypeSingle = connectionType.slice(1, -1);
                global.LOG(`This connection is an array of "${connectionTypeSingle}"`);

                // if this connection type is a model (it's a key on the allModels object)
                // then the sub query needs to be wrapped in an item/nextToken structure
                if (Object.prototype.hasOwnProperty.call(allModels, connectionTypeSingle)) {
                  global.LOG(`"${connectionTypeSingle}" is a model, so wrapping in items/nextToken structure`);
                  const extraSpaces = getSpacesFromDepth(depth + 1);
                  return `${spaces}${connectionName} {\n${extraSpaces}items {\n${fieldsListToString(
                    connectionTypeSingle,
                    singleField[connectionName],
                    allModels,
                    depth + 3, // Add an additional level of depth for items
                  )}\n${extraSpaces}}\n${extraSpaces}nextToken\n${spaces}}`;
                } else {
                  global.LOG(`"${connectionTypeSingle}" is NOT a model, building a simple sub query`);
                  // in this case, the connection is just a complex object so the sub query only specifies that object's fields
                  // and is NOT wrapped in an items/nextToken structure
                  return `${spaces}${connectionName} {\n${fieldsListToString(connectionTypeSingle,
                    singleField[connectionName],
                    allModels,
                    depth + 1)}\n${spaces}}`;
                }
              } else {
                global.LOG(`This connection is not an array, building a simple sub query`);
                return `${spaces}${connectionName} {\n${fieldsListToString(
                  connectionType,
                  singleField[connectionName],
                  allModels,
                  depth + 1,
                )}\n${spaces}}`;
              }
            })
            .filter(line => !!line)
            .join('\n');
        }
      })
      .join('\n');
  } else if (typeof fieldsList === 'object' && Array.isArray(fieldsList.items)) {
    const extraSpaces = getSpacesFromDepth(depth + 1);
    const itemsContent = fieldsList.items
      .map(singleField => {
        if (typeof singleField === 'string') {
          global.LOG(`Adding field "${singleField}" for "${modelName}"`);
          return `${extraSpaces}${singleField}`;
        } else {
          return handleComplexField(singleField, modelName, allModels, depth + 2);
        }
      })
      .join('\n');
    return `${spaces}items {\n${itemsContent}\n${spaces}}`;
  } else {
    throw new Error('Invalid fieldsList type');
  }
}

/**
 * @param {number} depth -- 0 = 0 spaces
 * @returns {string}
 */
function getSpacesFromDepth(depth) {
  let spaces = ''

  for (let i = 0; i < depth; i++) {
    spaces += '  '
  }
  return spaces
}

module.exports = GeneratedModel
