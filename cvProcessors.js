/*

OpenCV Part

*/

const SCALEDOWN = 0.003921568;
let maskOpacity = 0;
const rfColors = [
[244, 208, 179],
[238, 200, 163],
[206, 161, 118],
[174, 127, 102],
[158, 105, 80],
[126, 76, 54],
]

const coefForeheadHeight = 0.7;
/*
const foreheadPoints = [
[0.9, 0.2],
[0.6, 0.6],
[0.2, 0.9]
]*/
const foreheadPoints = [
[0.31, 0.98],
[0.55, 0.90],
[0.82, 0.76],
[0.93, 0.5],
[1.0, 0.21],
]; 


class OpenCVProcessor
{
	constructor(width, height){
		this.width = width;
		this.height = height;
		console.log('OpenCVProcessor.ctor() : video.heigth : ' + height + ' video.width : ' + width);
	}
	
	changeSize(width, height) {
        this.width = width;
        this.height = height;
    }
	
	processMat(src, includeContours, extrudeContours, colorArray, blendingMode){
		this.addForehead(includeContours[0], extrudeContours[0], extrudeContours[1]);
		
		let blendMethod;
		switch (blendingMode) {
		  case 0:
			blendMethod = this.blendAdd.bind(this);
			break;
		  case 1:
		    maskOpacity = 86;
			blendMethod = this.blendDarken.bind(this);
			break;
		  case 2:
		    maskOpacity = 64;
			blendMethod = this.blendColorBurn.bind(this);
			break;
		}
		
		var mask = this.contoursToMask(includeContours);
		var extrudeMask = this.contoursToMask(extrudeContours);
		cv.subtract (mask, extrudeMask, mask);
		cv.GaussianBlur(mask, mask, {width: 43, height: 43}, 0, 0, cv.BORDER_DEFAULT);
		
		var result = this.applyFilter(src, mask, colorArray, blendMethod);
		
		mask.delete();
		extrudeMask.delete();
		return result;
	}
	
	addForehead(faceEdge, rightEye, leftEye){
		let leftPoint = faceEdge[0];
		let rightPoint = faceEdge[faceEdge.length - 1];
		let chinPoint = faceEdge[~~(faceEdge.length * 0.5)];
		let leftEyePoint = vecAverage(leftEye);
		let rightEyePoint = vecAverage(rightEye);
		let faceCenter = vecLerp(leftEyePoint, rightEyePoint, 0.5);
		
		let faceHeight = vecDistance(faceCenter, chinPoint);
		let foreheadHeight = faceHeight * coefForeheadHeight;
		let upDir = vecDirection(chinPoint, faceCenter);
		let foreheadTop = vecAdd(faceCenter, vecMultiply(upDir, foreheadHeight));
		
		let upVector = vecSubtract(foreheadTop, faceCenter);
		let leftVector = vecSubtract(leftPoint, faceCenter);
		let rightVector = vecSubtract(rightPoint, faceCenter);
	
	    for (let i = foreheadPoints.length-1; i >= 0; i--){
			faceEdge.push( vecAdd(faceCenter, vecAdd(vecMultiply(rightVector, foreheadPoints[i][0]), vecMultiply(upVector, foreheadPoints[i][1]))) );
		}
		
     	faceEdge.push(foreheadTop);
		
		for (let i = 0; i < foreheadPoints.length; i++){
			faceEdge.push( vecAdd(faceCenter, vecAdd(vecMultiply(leftVector, foreheadPoints[i][0]), vecMultiply(upVector, foreheadPoints[i][1]))) );
		}

		return;
	}

	contoursToMask(contoursArray){
		var res = cv.Mat.zeros(this.height, this.width, cv.CV_8UC3);
		var nextContour = cv.Mat.zeros(this.height, this.width, cv.CV_8UC3);
		var black = new cv.Scalar(0,0,0);
		
		for (var j = 0; j < contoursArray.length; j++){
			nextContour.setTo(black);
			let contours = new cv.MatVector();
			var c = new cv.Mat(contoursArray[j].length,1,cv.CV_32SC2);
			
			for (var i = 0; i < contoursArray[j].length; i++){
				c.data32S[2*i] = contoursArray[j][i][0];
				c.data32S[((2*i)+1)] = contoursArray[j][i][1];
			}
			
			contours.push_back(c);
		cv.drawContours(nextContour, contours, -1, [maskOpacity, maskOpacity, maskOpacity, maskOpacity], -1, 8);
		cv.add(res, nextContour, res);
		c.delete();
		}

		nextContour.delete();
		return res;
	}

	applyFilter(src, mask, colorArray, blendFunction){
		var filteredImage = new cv.Mat(this.height, this.width, cv.CV_8UC3);
		var colorScalar = new cv.Scalar(colorArray[0], colorArray[1], colorArray[2]);       
		filteredImage.setTo(colorScalar);

		var newSrc = new cv.Mat(this.height, this.width, cv.CV_8UC3);
		cv.cvtColor(src, newSrc, cv.COLOR_BGRA2BGR);

		blendFunction(newSrc, filteredImage);

		var flippedMask = new cv.Mat(this.height, this.width, cv.CV_8UC3);
		cv.bitwise_not(mask, flippedMask);
		cv.multiply(filteredImage, mask, filteredImage, SCALEDOWN);
		cv.multiply(newSrc, flippedMask, newSrc, SCALEDOWN);
		cv.add(filteredImage, newSrc, filteredImage);

		flippedMask.delete();
		newSrc.delete();
		return filteredImage;
	}

	blendAdd(back, front){
		cv.add(back, front, front);
	}

	blendDarken(back, front){
		cv.min(back, front, front);
	}

	blendColorBurn(back, front){  
		var result = new cv.Mat(this.height, this.width, cv.CV_8UC3); 
		var maxMat = new cv.Mat(this.height, this.width, cv.CV_8UC3);
		maxMat.setTo(new cv.Scalar(255,255,255));

		cv.subtract(maxMat, back, result);
		cv.divide(result, front, result, 255);
		cv.subtract(maxMat, result, front);

		maxMat.delete();
		result.delete();
		return;
	}
	
}

function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

function vecAdd(a, b) {
	return [(a[0] + b[0]), (a[1] + b[1])];
}

function vecSubtract(a, b) {
	return [(a[0] - b[0]), (a[1] - b[1])];
}

function vecMultiply(a, k) {
	return [(a[0] * k), (a[1] *k)];
}

function vecLerp(a,b,k) {
	return [(a[0] + k * (b[0] - a[0])), (a[1] + k * (b[1] - a[1]))];
}

function vecDistance(a, b) {
	return Math.sqrt((a[0] - b[0]) * (a[0] - b[0]) + (a[1] - b[1])*(a[1] - b[1]));
}

function vecLength(a){
	return vecDistance(a, [0, 0]);
}

function vecHeading(a, b){
	return vecSubtract(b, a);
}

function vecDirection(a, b){
	heading = vecHeading(a, b);
	distance = vecDistance(a, b);
	return [(heading[0] / distance), (heading[1] / distance)];
}

function vecAverage(pointArray){
	let sumX = 0.0;
	let sumY = 0.0;
	
	for (i = 0; i < pointArray.length; i++){
		sumX = sumX + pointArray[i][0];
		sumY = sumY + pointArray[i][1];
	}
	
	return [(sumX / pointArray.length), (sumY / pointArray.length)];
}