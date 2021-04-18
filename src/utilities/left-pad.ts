export default function leftPad(value: string|number|boolean, minLength: number, letter: string): string {
  let valueString = value.toString();
  if(valueString.length >= minLength) {
    return valueString;
  }
  let prefix = '';
  for(let i = valueString.length; i < minLength; i++) {
    prefix += letter;
  }
  valueString = prefix + valueString;
  return valueString;
}