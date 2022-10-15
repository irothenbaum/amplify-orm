class AbstractFieldType {}

// ---------------------------------------------------------

class NumberFieldType extends AbstractFieldType {}

// ---------------------------------------------------------

class StringFieldType extends AbstractFieldType {}

// ---------------------------------------------------------

class ObjectFieldType extends AbstractFieldType {}

// ---------------------------------------------------------

class DateFieldType extends AbstractFieldType {}

// ---------------------------------------------------------

class ArrayFieldType extends AbstractFieldType {}

// ---------------------------------------------------------

class AssociationFieldType extends AbstractFieldType {}

module.exports = {
  NumberFieldType,
  StringFieldType,
  ObjectFieldType,
  DateFieldType,
  ArrayFieldType,
  AssociationFieldType,
}
