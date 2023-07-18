namespace Tenor {
  export const convertTenor = (days: number) => days * 3600 * 24

  export const convertTenors = (days: number[]) => days.map(day => convertTenor(day))

  export const convertToTenor = (seconds: number) => seconds / 3600 / 24
}

export default Tenor
