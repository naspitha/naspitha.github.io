var svg = d3.select("#bohrSimulation"),
margin = 50, topmargin = 20, divider = 10
var width = svg.attr("width")*1,
height = svg.attr("height")*1;
var panelDimension = Math.min((width-2*margin)/2-divider/2, height-topmargin)

// Constants
var a0 = 5.3e-11, e0 = 8.8542e-12, mE = 9.11e-31, qe = 1.602e-19, joulesToEV = 13.6/2.17896e-18
var orbitalSequence = ["1s","1s","2s","2s","2p","2p","2p","2p","2p","2p","3s","3s","3p","3p","3p","3p","3p","3p","4s","4s"]
var orbitalIds = [0, 1, 0, 1, 0, 1, 2, 3, 4, 5, 0, 1, 0, 1, 2, 3, 4, 5, 0, 1]
var occupancy = {"1s":1, "2s":0, "2p":0, "3s":0, "3p":0, "4s":0}
var screeningEquations = {
    // from https://aip.scitation.org/doi/pdf/10.1063/1.1733573
    "1s": (occ)=> 0.3*(occ["1s"]-1)+0.0072*(occ["2s"]+occ["2p"])+ 0.0158*(occ["3s"]+occ["3p"]+occ["4s"]),
    "2s": (occ)=> 1.7208 + 0.3601*(occ["2s"]+occ["2p"]-1) + 0.2062*(occ["3s"]+occ["3p"]+occ["4s"]),
    "2p": (occ)=> 2.5787 + 0.3326*(occ["2p"]-1) - 0.0773*occ["3s"] - 0.0161*(occ["3p"]+occ["4s"]),
    "3s": (occ)=> 8.4927 + 0.2501*(occ["3s"]+occ["3p"]-1)+0.0778*occ["4s"],
    "3p": (occ)=> 9.3345 + 0.3803*(occ["3p"]-1) + 0.0526*occ["4s"],
    "4s": (occ)=> 15.505 + 0.0971*(occ["4s"]-1),
}
var orbitalColors = {
    "1s": "rgb(180, 0, 240", "2s": "rgb(0,100,240)", "2p": "rgb(0, 220, 0)",  "3s": "rgb(230, 230, 0)", 
    "3p": "rgb(255, 127, 0)", "4s": "rgb(230, 0, 0)"}

// Parameters
var Z = 14
var electrons = [{"id": 0, "orbital":"1s", "orbitalId":0, "n": 1, "s":0, "zEff":Z, "radius": 1, "theta": Math.PI, "energy": 1, "fCoulNuc":0}]

// iteration 1: adding electrons
for (let i=1; i<Z; i++) {
    orbital = orbitalSequence[i]
    electrons.push({"id": i, "orbital":orbital, "orbitalId": orbitalIds[i], "n": +orbital[0], "zEff":Z})
    occupancy[orbital] += 1
}

var offsetIndex=0
// iteration 2: correcting for screening constants, effective nuclear charge, and adding radius
for (let i=0; i<Z; i++) {
    if (i!=0 && electrons[i].orbital != electrons[i-1].orbital){offsetIndex+=1}
    electrons[i].s = screeningEquations[electrons[i].orbital](occupancy)
    electrons[i].zEff -= electrons[i].s
    electrons[i].radius = a0 * electrons[i].n**2/electrons[i].zEff
    electrons[i].fCoulNuc = coulombicForceNucleus(electrons[i])
    electronsInThisOrbital = occupancy[electrons[i].orbital]
    offset = [Math.PI/2, 0][offsetIndex%2]
    angle = getAngles(electronsInThisOrbital, offset)[electrons[i].orbitalId]
    electrons[i].theta = angle
}

// Graphing
// Radius panel
var radiusPanel = svg.append("g").attr("id", "radiusPanel")
var radiusPlot = radiusPanel.append("rect")
    .attr("x",margin)
    .attr("y",topmargin)
    .attr("height", panelDimension)
    .attr("width", panelDimension)
    .attr("stroke", "rgb(240, 240, 240)")
    .attr("fill", "rgb(255, 255, 255)")
var xSpace = d3.scaleLinear().domain([-3, 3])
    .range([radiusPlot.attr("x"), +radiusPlot.attr("x")+ +radiusPlot.attr("width")])
var ySpace = d3.scaleLinear().domain([-3, 3])
    .range([radiusPlot.attr("y"), +radiusPlot.attr("y") + +radiusPlot.attr("height")])
var x_axis = d3.axisBottom().scale(xSpace);
var y_axis = d3.axisLeft().scale(ySpace)

radiusPanel.selectAll("shells")
    .data(electrons.filter((obj) => obj.orbitalId === 0))
    .enter().append("circle")
    .attr("cx", xSpace(0)).attr("cy", ySpace(0))
    .attr("r", function(d){return xSpace(d.radius*1e10)-xSpace(0)})
    .style("stroke", function(d){ return orbitalColors[d.orbital]})
    .style("stroke-width", 3)
    .style("fill", "none")
    .style("opacity", 0.5)
radiusPanel.selectAll("electronDots")
    .data(electrons)
    .enter().append("circle")
        .attr("cx", function(d){return xSpace(d.radius*1e10*Math.cos(d.theta))})
        .attr("cy", function(d){return ySpace(d.radius*1e10*Math.sin(d.theta))})
        .attr("r", 1.5)
        .style("fill", function(d){ return orbitalColors[d.orbital]})
        .style("stroke", function(d){ return "rgb(20, 20, 20)"})
        .style("stroke-width", 0.5)


// Energy panel
var energyPlot = svg.append("rect")
    .attr("x", margin+ panelDimension +divider)
    .attr("y",topmargin)
    .attr("height", panelDimension)
    .attr("width", panelDimension)
    .attr("fill", "gray")

svg.append("g").attr("id","energyPanel")

// Functions
function getAngles(number, offset=0){
    angles = []
    for (let i=0; i<number; i++){
        angles.push(2*Math.PI/number*i+offset)
    }
    return angles
}

function coulombicForceNucleus(electron) {
    return Z*qe**2/(4*Math.PI*e0*electron.radius**2)
}

function coulombicRepulsion(electron1, electron2) {
    // returns a vector of the repulsion force on electron 1
    x1 = electron1.radius*Math.cos(electron1.theta)
    y1 = electron1.radius*Math.sin(electron1.theta)
    x2 = electron2.radius*Math.cos(electron2.theta)
    y2 = electron2.radius*Math.sin(electron2.theta)
    dx = x1-x2; dy = y1-y2
    distance = Math.sqrt(dx**2+dy**2)
    fC = qe**2/(4*Math.PI*e0*distance**2)
    fCx = fC*dx/distance; fCy=fC*dy/distance
    normalVector = [Math.cos(electron1.theta), Math.sin(electron1.theta)]
    tangentVector = [-normalVector[1], normalVector[0]]
    forceVector = [fCx, fCy]
    alongNormal = normalVector[0]*forceVector[0]+normalVector[1]*forceVector[1]
    alongTangent = tangentVector[0]*forceVector[0]+tangentVector[1]*forceVector[1]
    return (alongNormal, alongTangent)
}



console.log(electrons)