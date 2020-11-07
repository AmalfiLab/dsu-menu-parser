# dsu-menu-parser

## Example

```js
const { MenuParser, options } = require('dsu-menu-parser');

const parser = new MenuParser(path, options.martiri);

const dayOfWeek = 0;  // monday
const launch = await parser.getMenu(dayOfWeek, 'launch');
const dinner = await parser.getMenu(dayOfWeek, 'dinner');

console.log({ launch, dinner });
```