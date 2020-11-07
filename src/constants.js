const Rectangle = require('./rectangle');

const rowHeight = 143;
const colWidth = 112;
const colMargin = -20;

function getMeatBoxes(topLeftX, topLeftY) {
  let boxes = [{
    launch: new Rectangle(topLeftX, topLeftY - rowHeight, topLeftX + colWidth, topLeftY),
    dinner: new Rectangle(topLeftX, topLeftY - 2*rowHeight, topLeftX + colWidth, topLeftY - rowHeight)
  }];

  for (let i = 1; i < 7; ++i) {
    const lastLaunch = boxes[i - 1].launch;
    const lastDinner = boxes[i - 1].dinner;
    boxes.push({
      launch: new Rectangle(lastLaunch.xStart + colWidth, lastLaunch.yStart,
                            lastLaunch.xEnd + colWidth, lastLaunch.yEnd),
      dinner: new Rectangle(lastDinner.xStart + colWidth, lastDinner.yStart,
                            lastDinner.xEnd + colWidth, lastDinner.yEnd),
    });
  }

  boxes.forEach(({ launch, dinner }) => {
    // launch.xStart -= colMargin;
    launch.xEnd += colMargin;
    // dinner.xStart -= colMargin;
    dinner.xEnd += colMargin;
  })

  return boxes;
}

const daysBoxes = [
  { // Monday
    launch: new Rectangle(52, 265, 172, 392),
    dinner: new Rectangle(52, 120, 172, 245)
  },
  { // Thursday
    launch: new Rectangle(164, 265, 275, 392),
    dinner: new Rectangle(164, 120, 300, 245)
  },
  { // Wednesday
    launch: new Rectangle(275, 265, 390, 392),
    dinner: new Rectangle(275, 120, 390, 245)
  },
  { // Tuesday
    launch: new Rectangle(390, 265, 505, 392),
    dinner: new Rectangle(390, 120, 505, 245)
  },
  { // Friday
    launch: new Rectangle(500, 265, 620, 392),
    dinner: new Rectangle(500, 120, 620, 245)
  },
  { // Saturday
    launch: new Rectangle(615, 265, 730, 392),
    dinner: new Rectangle(615, 120, 730, 245)
  },
  { // Sunday
    launch: new Rectangle(730, 260, 840, 392),
    dinner: new Rectangle(730, 120, 840, 245)
  },
];

module.exports = {
  daysBoxes,
  getMeatBoxes
};