const PDFParser = require("pdf2json");
const graphlib = require('@dagrejs/graphlib');
const fs = require('fs');
const Rectangle = require('./src/rectangle');

const options = {
  martiri: {
    grid: { rows: 2, cols: 7 }
  }
}

function findTextInBox(texts, box) {
  let output = []
  for (const t of texts) {
    if (t.y >= box.yStart && t.y <= box.yEnd &&
        t.x >= box.xStart && t.x <= box.xEnd) {
      output.push({ ...t });
    }
  }

  return output;
}

function loadPdf(path) {
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser();
    pdfParser.on("pdfParser_dataError", reject);
    pdfParser.on("pdfParser_dataReady", resolve);
    pdfParser.loadPDF(path);
  });
}

function extractLines(pdfData) {
  let lines = [];
  let i = 0;
  for (const fill of pdfData.formImage.Pages[0].Fills) {
    const {w, h} = fill;
    if (!((w < 6 || w > 8) && (h < 6 || h > 10))) {
      lines.push({ id: i, ...fill });
    }
    ++i;
  }

  return lines;
}

function buildArcs(lines) {
  let arcs = [];
  
  const distance = (a, b) => {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2));
  }

  const th = 0.4;
  for (i in lines) {
    for (j in lines) {
      if (i == j) continue;
      const a = lines[i];
      const b = lines[j];
      if (distance([a.x, a.y], [b.x, b.y]) < th ||
          distance([a.x, a.y], [b.x + b.w, b.y + b.h]) < th ||
          distance([a.x + a.w, a.y + a.h], [b.x + b.w, b.y + b.h]) < th ||
          distance([a.x + a.w, a.y + a.h], [b.x, b.y]) < th) {
        arcs.push([a.id, b.id]);
      }
    }
  }

  return arcs;
}

function buildGraph(lines) {
  let g = new graphlib.Graph({ directed: false });
  lines.forEach(l => g.setNode(l.id, l));

  const arcs = buildArcs(lines);
  arcs.forEach(a => g.setEdge(a[0], a[1]));
  return g;
}

function extractBiggestComponent(graph) {
  const comps = graphlib.alg.components(graph);

  let max_dim = 0;
  let max_index = 0;
  for (let i in comps) {
    if (comps[i].length > max_dim) {
      max_dim = comps[i].length;
      max_index = i;
    }
  }

  return comps[max_index];
}

function convertToRect(fill) {
  const rect = new Rectangle(
    fill[1].x,
    fill[0].y,
    fill[2].x,
    fill[3].y);
  return rect;
}

function computeBoxes(lines, rows, cols) {
  if (lines.length != rows*(2*cols + 1) + cols)
    throw `Not enough lines to extract a ${rows} x ${cols} grid`;

  const sortedLines = lines.sort((a, b) => {
    if (a.y < b.y) return -1;
    if (a.y == b.y && a.x < b.x) return -1;
    return 1;
  });

  let boxes = [];
  for (let i = 0; i < rows; ++i) {
    boxes.push([]);
    for (let j = 0; j < cols; ++j) {
      const offset = i*(2*cols + 1);
      const indexes = [
        offset + j,
        offset + cols + j,
        offset + cols + j + 1,
        offset + 2*cols + j + 1
      ];
      boxes[i].push([]);
      for (const idx of indexes) {
        boxes[i][j].push(sortedLines[idx]);
      }
    }
  }

  return boxes.map(rows => {
    return rows.map(convertToRect);
  });
}

function loadGrid(pdfData, rows, cols) {
  const lines = extractLines(pdfData);
  const graph = buildGraph(lines);
  const gridNodes = extractBiggestComponent(graph);
  const gridLines = gridNodes.map(idx => graph.node(idx));
  const boxes = computeBoxes(gridLines, rows, cols);
  return boxes;
}

function loadText(pdfData) {
  console.log("loadText");
  return pdfData.formImage.Pages[0].Texts.map(t => ({
    x: t.x,
    y: t.y + 0.2,
    w: t.w,
    str: decodeURIComponent(t.R[0].T)
  }));
}

function cleanText(text) {
  let cleanedText = text.replace(/\s+/g, " ");
  cleanedText = cleanedText.replace("PIZZA", "Pizza");
  cleanedText = cleanedText.replace("CALZONE", "Calzone");
  cleanedText = cleanedText.replace(/([a-z])([A-Z])/g, (match, p1, p2) => {
    return `${p1} ${p2}`;
  });

  return cleanedText;
}

class MenuParser {
  constructor(uri, options) {
    this.uri = uri;
    this.options = options;
    this.loaded = false;
  }

  async _load() {
    const pdfData = await loadPdf(this.uri);
    this.grid = loadGrid(pdfData,
        this.options.grid.rows, this.options.grid.cols);
    this.texts = loadText(pdfData);
    this.loaded = true;
  }

  async getMenu(dayOfWeek, mealOfDay) {
    if (['launch', 'dinner'].indexOf(mealOfDay) == -1)
      throw 'Invalid mealOfDay';

    if (!this.loaded) {
      await this._load();
    }

    const i = (mealOfDay == 'launch') ? 0 : 1;
    const j = dayOfWeek;
    
    const dayItems = findTextInBox(this.texts, this.grid[i][j]);
    const boxText = dayItems.reduce((prev, cur) => (prev + cur.str), "");
    const cleanedText = cleanText(boxText);
    return cleanedText;
  }
};

module.exports = {
  MenuParser,
  options
};