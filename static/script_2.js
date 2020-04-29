window.onload = function(){
    chart = anychart.line();
    chart.container("chartContainer");;
    
    var xScale = anychart.scales.linear();
    xScale.minimum(0);
    xScale.maximum(1.01);
    chart.xScale(xScale);
    var yScale = anychart.scales.linear();
    yScale.minimum(0.04);
    yScale.maximum(0.06);
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

    var zoomController = anychart.ui.zoom();
    zoomController.target(chart);
    zoomController.render();    
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
    segment = [0, 1]
    
    realY(x){
        return 1 / (10 * (x * x - 0.8 * x + 2));
    }
    
    f(x, y) {
        return -20 * y * y * (x - 0.4);
    }
    
    dx(x, y){
        return -20 * y * y
    }
    
    dy(x, y){
        return -40 * y * (x - 0.4)
    }
    
    dxdx(x, y){
        return 0
    }
    
    dxdy(x, y){
        return -40 * y
    }
    
    dydy(x, y){
        return -40 * (x - 0.4)
    }
    
    getH(n){
        return (this.segment[1] - this.segment[0]) / n;
    }
    
    getX(n){
        let h = this.getH(n);
        return Array.from(new Array(n), (e, i) => (this.segment[0] + i * h));
    }   
}

const func = new Function()
const y0 = 0.05
const eps = 0.0000000001

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
        "Эйлера явный", 
        function(n, f) {
            h = f.getH(n);
            x = f.segment[0]
            y = y0;
            values = [[x, y]];
            
            for (i = 0; i < n; i++){
                y = y + h * f.f(x, y);
                x = x + h
                values.push([x, y]);
            }
            return values;
        }),
    new Method(
        "Эйлера с пересчетом", 
        function(n, f) {
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
        }),
    new Method(
        "Эйлера неявный", 
        function(n, f) {
            h = f.getH(n);
            x = f.segment[0]
            y = y0;
            values = [[x, y]];
            
            for (i = 0; i < n; i++){
                a = 20 * h * (x + h - 0.4)
                b = 1
                c = -y
                d = b*b - 4 * a * c
                if (-eps < d && d < 0)
                    d = 0
                newY = (-b + Math.sqrt(d)) / (2 * a)
                if (Math.abs(a) > eps && d >= 0)
                    y = newY
                x = x + h
                values.push([x, y]);
            }
            return values;
        }),
    new Method(
        "Коши", 
        function(n, f) {
            h = f.getH(n);
            x = f.segment[0]
            y = y0;
            values = [[x, y]];
            
            for (i = 0; i < n; i++){
                helpY = y + h / 2 * f.f(x, y);
                y = y + h * f.f(x + h / 2, helpY);
                x = x + h
                values.push([x, y]);
            }
            return values;
        }),
    new Method(
        "Рунге-Кутты 4-го порядка", 
        function(n, f) {
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
        }),
    new Method(
        "Тейлора 2-го порядка", 
        function(n, f) {
            h = f.getH(n);
            x = f.segment[0]
            y = y0;
            values = [[x, y]];
            
            for (i = 0; i < n; i++){
                der_y = f.f(x, y)
                der2_y = f.dx(x, y) + f.dy(x, y) * f.f(x, y)
                y = y + der_y * h + der2_y / 2 * h * h
                x = x + h
                values.push([x, y]);
            }
            return values;
        }),
    new Method(
        "Тейлора 3-го порядка", 
        function(n, f) {
            h = f.getH(n);
            x = f.segment[0]
            y = y0;
            values = [[x, y]];
            
            for (i = 0; i < n; i++){
                der_y = f.f(x, y)
                der2_y = f.dx(x, y) + f.dy(x, y) * f.f(x, y)
                der3_y = f.dxdx(x, y) + f.dxdy(x, y) * f.f(x, y) + 
                    f.dy(x, y) * (f.dx(x, y) + f.dy(x, y) * f.f(x, y)) + 
                    f.f(x, y) * (f.dxdy(x, y) + f.dydy(x, y) * f.f(x, y))
                y = y + der_y * h + der2_y * h * h / 2 + der3_y * h * h * h/ 3
                x = x + h
                values.push([x, y]);
            }
            return values; 
        }),
    new Method(
        "Адамса экстраполяционный 2-шаговый", 
        function(n, func) {
            h = func.getH(n);
            x = func.segment[0]
            y = y0;
            f = func.f(x, y)
            values = [[x, y, f]];
            
            for (i = 0; i < n; i++){
                a = 10 * h * (x + h - 0.4)
                b = 1
                c = - h / 2 * f - y
                d = b*b - 4 * a * c
                if (-eps < d && d < 0)
                    d = 0
                newY = (-b + Math.sqrt(d)) / (2 * a)
                if (Math.abs(a) > eps && d >= 0)
                    y = newY
                x = x + h
                f = func.f(x, y)
                values.push([x, y, f]);
            }
            return values;
        }),
    new Method(
        "Адамса экстраполяционный 3-шаговый", 
        function(n, func) {
            h = func.getH(n);
            
            prevX = func.segment[0]
            prevY = y0;
            prevF = func.f(prevX, prevY)
            values = [[prevX, prevY, prevF]];
            
            x = prevX + h
            y = calculateRungeKuttaStep(func.f, prevX, prevY, h)
            f = func.f(x, y)
            values.push([x, y, f]);
            
            for (i = 1; i < n; i++){
                a = 25 / 3 * h * (x + h - 0.4)
                b = 1
                c = - 2 / 3 * h * f + h / 12 * prevF - y
                d = b*b - 4 * a * c
                if (-eps < d && d < 0)
                    d = 0
                newY = (-b + Math.sqrt(d)) / (2 * a)
                if (Math.abs(a) > eps && d >= 0)
                    y = newY
                x = x + h
                f = func.f(x, y)
                values.push([x, y, f]);
                [prevX, prevY, prevF] = values[i]
            }
            return values;
        }
    )
]

function calculateRungeKuttaStep(func, x, y, h){
    k1 = h * func(x, y);
    k2 = h * func(x + h / 2, y + k1 / 2);
    k3 = h * func(x + h / 2, y + k2 / 2);
    k4 = h * func(x + h, y + k3);
    return y + k1 / 6 + k2 / 3 + k3 / 3 + k4 / 6;
}