function getDigits(value: string | number, maximumLength: number): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).replace(/\D/g, '').slice(0, maximumLength);
}

export function formatPhone(value: string | number): string {
  const digits = getDigits(value, 11);

  if (digits.length <= 2) {
    return digits ? '(' + digits : '';
  }

  if (digits.length <= 6) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2);
  }

  if (digits.length <= 10) {
    return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
  }

  return '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7);
}

export function formatCpf(value: string | number): string {
  const digits = getDigits(value, 11);
  let formattedValue = digits.slice(0, 3);

  if (digits.length > 3) {
    formattedValue += '.' + digits.slice(3, 6);
  }

  if (digits.length > 6) {
    formattedValue += '.' + digits.slice(6, 9);
  }

  if (digits.length > 9) {
    formattedValue += '-' + digits.slice(9);
  }

  return formattedValue;
}

export function formatCnpj(value: string | number): string {
  const digits = getDigits(value, 14);
  let formattedValue = digits.slice(0, 2);

  if (digits.length > 2) {
    formattedValue += '.' + digits.slice(2, 5);
  }

  if (digits.length > 5) {
    formattedValue += '.' + digits.slice(5, 8);
  }

  if (digits.length > 8) {
    formattedValue += '/' + digits.slice(8, 12);
  }

  if (digits.length > 12) {
    formattedValue += '-' + digits.slice(12);
  }

  return formattedValue;
}

export function removeInputMask(value: string | number, maximumLength: number): string {
  return getDigits(value, maximumLength);
}
