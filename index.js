const pdf = require('pdf-parse');
const fs = require('fs');
const { getMeatBoxes } = require('./src/constants');

function renderPage(pageData) {
  const renderOptions = {
    normalizeWhitespace: false,
    disableCombineTextItems: false
  };

  console.log(pageData.getTextContent);

  return pageData.getTextContent(renderOptions).then(textContent => {
    let textArray = [];
    let text = {
      str: '',
      y: null,
      xStart: null,
      xEnd: null
    };
    
    for (let item of textContent.items) {
      if (text.y !== null && text.y != item.transform[5]) {
        textArray.push({ ...text });
        text.str = '';
        text.y = null;
        text.xStart = null;
        text.xEnd = null;
      }

      text.str += item.str;
      if (text.xStart === null)
        text.xStart = item.transform[4];
      text.xEnd = item.transform[4] + item.width;
      text.y = item.transform[5];
    }
    return JSON.stringify(textArray);
  });
}

const pdfParseOptions = {
  pagerender: renderPage
}



function findItemBox(items, box) {
  let output = []
  for (const item of items) {
    if (item.y >= box.yStart && item.y <= box.yEnd &&
        item.xStart >= box.xStart && item.xStart <= box.xEnd) {
      output.push({ ...item });
    }
  }

  return output;
}

function parseMenu(text, dayOfWeek, mealOfDay) {
  
}

class MenuParser {
  constructor(uri) {
    this.uri = uri;
    this.loaded = false;
  }

  async _loadItems() {
    const dataBuffer = await fs.promises.readFile(this.uri);
    const data = await pdf(dataBuffer, pdfParseOptions);
    this.data = data;
    this.items = JSON.parse(data.text);
    
    const ref = await this._getReferencePt();
    this.boxes = getMeatBoxes(ref[0], ref[1]);
    this.loaded = true;
  }

  async _getReferencePt() {
    let mondayPt = null;
    for (let i in this.items) {
      const item = this.items[i];
      if (item.str.startsWith('LUNED')) {
        mondayPt = [item.xStart, item.y];
      }
    }

    if (!mondayPt)
      throw 'Missing reference text in the pdf';
    
    return [
      mondayPt[0] - 34.2,
      mondayPt[1] - 16.00
    ];
  }

  _cleanText(text) {
    let cleanedText = text.replace(/\s+/g, " ");
    cleanedText = cleanedText.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
      return `${p1} ${p2}`;
    });

    return cleanedText;
  }

  async getMenu(dayOfWeek, mealOfDay) {
    if (!this.loaded) {
      await this._loadItems();
    }

    const dayItems = findItemBox(this.items, this.boxes[dayOfWeek][mealOfDay]);
    console.log(dayItems);
    const boxText = dayItems.reduce((prev, cur) => (prev + cur.str), "");
    
    const cleanedText = this._cleanText(boxText);
    return cleanedText;
  }

  async getDebug() {
    if (!this.loaded) {
      await this._loadItems();
    }

    return { items: this.items, data: this.data, boxes: this.boxes };
  }
};

module.exports = {
  MenuParser
};