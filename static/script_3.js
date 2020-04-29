window.onload = function(){
    chart = anychart.line();
    chart.container("chartContainer");;
    
    var xScale = anychart.scales.linear();
    xScale.minimum(0);
    xScale.maximum(1.01);
    chart.xScale(xScale);
    var yScale = anychart.scales.linear();
    yScale.minimum(-0.9);
    yScale.maximum(0.2);
    yScale.minimum(-10);
    yScale.maximum(10);
    chart.yScale(yScale);
    chart.xAxis().title("X");
    chart.yAxis().title("Y");
    
    chart.legend()
      .enabled(true)
      .position("right")
      .itemsLayout("vertical-expandable")
    
    allDataSets = [];
    for (const method of methods.slice(1)) {
        var data = anychart.data.set([]);
        allDataSets.push(data);
        var series = chart.line(data);
        series.name(method.name);
        series.connectMissingPoints(true);
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

function setSegmentNumber(newValue) {
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
    n = parseInt(n);
    
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
    C1 = 1 - 2.6 / Math.E;
    C2 = 0;
    
    realY(x){
        return this.C1 * Math.pow(Math.E, x) + alpha * x*x - alpha * x + this.C2;
    }
    
    yDer(x, y, y1) {
        return y1;
    }
    
    secondDer(x, y, y1){
        return y + 2 * (alpha + 1) + alpha* x * (1 - x);
    }
    
    dy(x, y){
        return 0
    }
    
    dxdx(x, y){
        return 0
    }
    
    dxdy(x, y){
        return 0
    }
    
    dydy(x, y){
        return 0
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
            h = f.getH(n);
            x = 0
            values = [];
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
            return [] //solveBisectionWithCauchyProblem(n, f, EulerWithPereschet);
        }),
    new Method(
        "Метод стрельбы:\nделение отрезка пополам\n+ метод Рунге-Кутты 4-го порядка",
        function() {
            return [] //solveBisectionWithCauchyProblem(n, f, RungeKutta);
        }
    )
]
function solveBisectionWithCauchyProblem(n, f, methodForCauchyProblem){
    left = -10;
    right = 10;
    index = 0;
    while (right - left > 0.0000001 && index < 100) {
        y0 = (left + right) / 2;
        // F = derY0 - y0 + alpha == 0
        derY0 = y0 - alpha;
        values = methodForCauchyProblem(n, f, y0, derY0);
        
        console.log(values);
        y1 = values[n][1];
        derY1 = values[n - 1][2];
        console.log("Y1", y1, "derY1", derY1);
        
        calculatedG = derY1 + y1 - 2 * Math.E - alpha + 2;
        // G = derY1 + y1 - 2 * Math.E - alpha + 2 == 0
        calculatedY1 = - derY1 + 2 * Math.E + alpha - 2 
        
        console.log(index, y0, derY0, calculatedG);
        
        if (calculatedG < 0)
            left = y0;
        else
            right = y0;
         
        index += 1;
    }
    return values;
}


function Euler(n, f, y0, yDer0) {
    h = f.getH(n);
    x = f.segment[0];
    y = y0;
    yDer = yDer0;
    values = [[x, y, yDer]];
    
    for (i = 0; i < n; i++){
        newY = y + h * f.yDer(x, y, yDer);
        newYDer = yDer + h * f.secondDer(x, y, yDer);
        x = x + h;
        y = newY;
        yDer = newYDer;
        values.push([x, y, yDer]);
    }
    return values;
}

function EulerWithPereschet(n, f, y0, yDer0) {
    h = f.getH(n);
    x = f.segment[0]
    y = y0;
    values = [[x, y]];
    
    for (i = 0; i < n; i++){
        helpY = y + h * f.f(x, y);
        y = y + h / 2 * (f.f(x, y) + f.f(x + h, helpY));
        x = x + h
        values.push([x, y]);
    }
    return values;
}

function RungeKutta(n, f, y0, yDer0) {
    h = f.getH(n);
    x = f.segment[0]
    y = y0;
    values = [[x, y]];
    
    for (i = 0; i < n; i++){
        y = calculateRungeKuttaStep(f.f, x, y, h)
        x = x + h
        values.push([x, y]);
    }
    return values;
}

function calculateRungeKuttaStep(func, x, y, h){
    k1 = h * func(x, y);
    k2 = h * func(x + h / 2, y + k1 / 2);
    k3 = h * func(x + h / 2, y + k2 / 2);
    k4 = h * func(x + h, y + k3);
    return y + k1 / 6 + k2 / 3 + k3 / 3 + k4 / 6;
}