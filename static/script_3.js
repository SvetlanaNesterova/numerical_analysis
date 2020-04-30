window.onload = function(){
    chart = anychart.line();
    chart.container("chartContainer");;
    
    var xScale = anychart.scales.linear();
    xScale.minimum(0);
    xScale.maximum(1.01);
    chart.xScale(xScale);
    
    setYScale(-0.9, 3.1);
    
    chart.xAxis().title("X");
    chart.yAxis().title("Y");
    
    chart.legend()
      .enabled(true)
      .position("right")
      .itemsLayout("vertical-expandable")
      .width('25%')
      .padding(7, 7, 7, 30);
    
    allDataSets = [];
    for (const method of methods.slice(1)) {
        var data = anychart.data.set([]);
        allDataSets.push(data);
        var series = chart.line(data);
        series.name(method.name);
        series.connectMissingPoints(true);
        series.normal().markers()
            .enabled(true)
            .type('circle')
            .size(2);
        series.hovered().markers()
            .enabled(true)
            .type('circle')
            .size(3);
        series.selected().markers()
            .enabled(true)
            .type('circle')
            .size(3);
    }
    
    setSegmentNumber(2);
    
    let trueValues = methods[0].calculate(50, func);
    var series = chart.line(trueValues);
    series.name("y(x)");
    series.connectMissingPoints(true);
    series.hovered().markers().enabled(false);
    series.selected().markers().enabled(false);    
}

function setYScale(min, max){
     var yScale = anychart.scales.linear();
        yScale.minimum(min);
        yScale.maximum(max);
        chart.yScale(yScale);
}

function setSegmentNumber(newValue) {
    newValue = parseInt(newValue);
    if (newValue == 1) {
        setYScale(-0.9, 7);
    }
    else {
        setYScale(-0.9, 3.1);
    }
    inputRange.value = newValue;
    inputNumber.value = newValue;
    changePlot(newValue);
};

function changeNumber(){
    var newValue = inputNumber.value;
    setSegmentNumber(newValue);
}

function changeRange(){
    var newValue = inputRange.value;
    setSegmentNumber(newValue);
}

function changePlot(n){    
    let index = 0;
    for (const method of methods.slice(1)) {
        let values = method.calculate(n, func);
        allDataSets[index].data(values);
        index += 1;
    }
    
    chart.draw();
}


class Method {
    constructor(name, calculation_func) {
        this.name = name
        this.calculate = calculation_func
    }
}

class Function {
    segment = [0, 1];
    C1 = 1;
    C2 = 1;
    
    realY(x){
        return this.C1 * Math.pow(Math.E, x) + this.C2 * Math.pow(Math.E, -x) +
            alpha * x*x - alpha * x - 2;
    }
    
    yDer(x, y, y1) {
        return y1;
    }
    
    secondDer(x, y, y1){
        return y + 2 * (alpha + 1) + alpha * x * (1 - x);;
    }
    
    p(x) {
        return 1;
    }
    
    q(x) {
        return 2 * (alpha + 1) + alpha * x * (1 - x);
    }
    
    getH(n){
        return (this.segment[1] - this.segment[0]) / n;
    }
}

const func = new Function();
const eps = 0.0000000001;
const alpha = 3.6;

const methods = [
    new Method(
        "y(x)", 
        function(n, f) {
            let h = f.getH(n);
            let x = 0
            let values = [];
            for (i = 0; i < n; i++){
                values.push([x, f.realY(x)]);
                x = x + h;
            }
            values.push([1, f.realY(1)]);
            return values; 
        }),
    new Method(
        "Метод стрельбы:\nделение отрезка пополам\n+ явный метод Эйлера", 
        function(n, f) {
            return solveBisectionWithCauchyProblem(n, f, Euler);
        }),
    new Method(
        "Метод стрельбы:\nделение отрезка пополам\n+ метод Эйлера с пересчетом",
        function(n, f) {
            return solveBisectionWithCauchyProblem(n, f, EulerWithPereschet);
        }),
    new Method(
        "Метод стрельбы:\nделение отрезка пополам\n+ метод Рунге-Кутты 4-го порядка",
        function(n, f) {
            return solveBisectionWithCauchyProblem(n, f, RungeKutta);
        }),
    new Method(
        "Метод разностной прогонки: ",
        function(n, f) {
            let h = f.getH(n);
            // yDer(0) = a0 * y(0) + a1
            // yDer(1) = - b0 * y(1) + b1
            let a0 = 1;
            let a1 = -alpha;
            let b0 = 1;
            let b1 = 2 * Math.E + alpha - 2;
            
            let x = f.segment[0];
            let coefs = [[0, 1 + a0 * h, -1, -a1 * h]];
            for (i = 1; i < n; i++){
                x = x + h;
                coefs.push([1, -(2 + f.p(x) * h * h), 1, f.q(x) * h * h]);
            }
            coefs.push([-1, 1 + b0 * h, 0, b1 * h]);
            console.log("Matrix coefs", coefs)
            
            var yValues = solveTridiagonalMatrixAlgorithm(coefs);
            console.log("Y", yValues);
            return yValues.map((y, i) => [f.segment[0] + i * h, y]);
        })
]

function solveTridiagonalMatrixAlgorithm(matrix) {
    let n = matrix.length;
    let lambda = 0;
    let mu = 0;
    let algorithmCoefs = [[lambda, mu]];
    
    for (coefs of matrix){
        let [a, b, c, d] = coefs;
        console.log(a, b, c, d);
        let newLambda = -c / (a * lambda + b);
        let newMu = (d - a * mu) / (a * lambda + b);
        
        lambda = newLambda;
        mu = newMu;
        algorithmCoefs.push([lambda, mu]);
    }
    console.log("lambda, mu", algorithmCoefs);
    
    let y = algorithmCoefs[n][1];
    let result = [y];
    for (i = n - 1; i > 0; i--) {
        lambda = algorithmCoefs[i][0];
        mu = algorithmCoefs[i][1];
        y = lambda * y + mu;
        result.push(y);
    }
    
    return result.reverse();
}

function solveBisectionWithCauchyProblem(n, f, methodForCauchyProblem){
    left = -10;
    right = 10;
    index = 0;
    while (right - left > 0.00000001 && index <= 100) {
        y0 = (left + right) / 2;
        // F = derY0 - y0 + alpha == 0
        derY0 = y0 - alpha;
        values = methodForCauchyProblem(n, f, y0, derY0);
        
        y1 = values[n][1];
        derY1 = values[n - 1][2];
        
        // G = derY1 + y1 - 2 * Math.E - alpha + 2 == 0
        calculatedG = derY1 + y1 - 2 * Math.E - alpha + 2;
        if (calculatedG < 0)
            left = y0;
        else
            right = y0;
         
        index += 1;
    }
    return values;
}

function Euler(n, f, y0, yDer0) {
    let h = f.getH(n);
    let x = f.segment[0];
    let y = y0;
    let yDer = yDer0;
    let values = [[x, y, yDer]];
    
    for (i = 0; i < n; i++){
        let newY = y + h * f.yDer(x, y, yDer);
        let newYDer = yDer + h * f.secondDer(x, y, yDer);
        x = x + h;
        y = newY;
        yDer = newYDer;
        values.push([x, y, yDer]);
    }
    return values;
}

function EulerWithPereschet(n, f, y0, yDer0) {
    let h = f.getH(n);
    let x = f.segment[0]
    let y = y0;
    let yDer = yDer0;
    let values = [[x, y, yDer]];
    
    for (i = 0; i < n; i++){
        let helpY = y + h * f.yDer(x, y, yDer);
        let newY = y + h / 2 * (f.yDer(x, y, yDer) + f.yDer(x + h, helpY, yDer));
                
        let helpYDer = y + h * f.yDer(x, y, yDer);
        let newYDer = yDer + h / 2 * (f.secondDer(x, y, yDer) + f.secondDer(x + h, helpY, yDer));
        
        x = x + h;
        y = newY;
        yDer = newYDer;
        values.push([x, y, yDer]);
    }
    return values;
}

function RungeKutta(n, f, y0, yDer0) {
    let h = f.getH(n);
    let x = f.segment[0]
    let y = y0;
    let yDer = yDer0;
    let values = [[x, y, yDer]];
    
    for (i = 0; i < n; i++){
        let newY = calculateRungeKuttaStep(wrapperForY(f.yDer, yDer), x, y, h);
        let newYDer = calculateRungeKuttaStep(wrapperForYDer(f.secondDer, y), x, yDer, h);
        
        x = x + h;
        y = newY;
        yDer = newYDer;
        values.push([x, y, yDer]);
    }
    return values;
}

function wrapperForY(func, yDer){
    return (x, y) => func(x, y, yDer);
}

function wrapperForYDer(func, y){
    return (x, yDer) => func(x, y, yDer);
}

function calculateRungeKuttaStep(func, x, y, h){
    k1 = h * func(x, y);
    k2 = h * func(x + h / 2, y + k1 / 2);
    k3 = h * func(x + h / 2, y + k2 / 2);
    k4 = h * func(x + h, y + k3);
    return y + k1 / 6 + k2 / 3 + k3 / 3 + k4 / 6;
}