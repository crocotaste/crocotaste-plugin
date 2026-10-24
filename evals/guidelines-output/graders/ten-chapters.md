---
type: regex
pattern: 'data-chapter="(?:0[1-9]|10)"'
flags: g
match: "count:10"
target: { source: file, path: BRAND.html }
---
