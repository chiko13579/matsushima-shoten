// 新しい正規表現: 「姓」「名」が単独で出現する場合のみマッチ
// [（(]姓[）)]? = 括弧付き姓
// (?<![お名])(姓|名)(?![前]) = 単独の姓/名（お名前の一部ではない）
const testCases = [
  'お名前＊',
  'お名前（姓）',
  'お名前(名)',
  '姓',
  '名',
  '氏名（姓）',
  '姓名',
  'せい',
  'めい'
];

for (const label of testCases) {
  const labelText = label.toLowerCase();
  const hasFullNameKeyword = labelText.match(/お名前|氏名|ご氏名|^名前$/);
  // 姓/名が括弧で囲まれている OR 単独で出現している（お名前の一部ではない）
  const hasSeparatedName = labelText.match(/[（(]姓[）)]|[（(]名[）)]|^姓$|^名$|せい$|めい$/);
  const isFullNameLabel = hasFullNameKeyword && !hasSeparatedName;
  console.log(`"${label}" -> お名前マッチ:${!!hasFullNameKeyword}, 姓名分離:${!!hasSeparatedName}, フルネーム判定:${!!isFullNameLabel}`);
}
