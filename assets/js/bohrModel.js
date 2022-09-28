// TODO: ticks
// TODO: energy arrow

var svg = d3.select("#bohrSimulation"),
margin = 50, topmargin = 20, divider = 10
var width = svg.attr("width")*1,
height = svg.attr("height")*0.9;
var panelDimension = Math.min((width-2*margin)/2-divider/2, height-topmargin)
var spatialDimension = 5.2

// Interface
var zIndicator = document.getElementById("Zvalue")
var rIndicator = document.getElementById("rValue")
var fIndicator = document.getElementById("fValue")
var eIndicator = document.getElementById("eValue")
var fSelectMenu = document.getElementById("orbitalToShowForce")
var eSelectMenu = document.getElementById("orbitalToShowEnergy")
var removeZ = document.getElementById("removeZ")
var addZ = document.getElementById("addZ")

// Constants
var a0 = 5.29e-11, e0 = 8.8542e-12, mE = 9.11e-31, qE = 1.602e-19, joulesToEV = 13.6/2.17896e-18, h=6.626e-34, hbar=h/(2*Math.PI)
var orbitalSequence = ["1s","1s","2s","2s","2p","2p","2p","2p","2p","2p","3s","3s","3p","3p","3p","3p","3p","3p","4s","4s"]
var orbitalIds = [0, 1, 0, 1, 0, 1, 2, 3, 4, 5, 0, 1, 0, 1, 2, 3, 4, 5, 0, 1]
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
var minEnergy = -250

// Parameters
var Z = 1; zIndicator.innerHTML = Z
var electrons, occupancy, occupiedShells, offsetIndex, radiusPanel, radiusPlot, xSpace, ySpace, x_axis, y_axis, energyPlot, energyPanel
var radius

//Permanent graph elements
// Radius panel
radiusPanel = svg.append("g").attr("id", "radiusPanel")
radiusPlot = radiusPanel.append("rect")
    .attr("x",margin)
    .attr("y",topmargin)
    .attr("height", panelDimension)
    .attr("width", panelDimension)
    // .attr("stroke", "rgb(240, 240, 240)")
    .attr("fill", "rgb(255, 255, 255)")
xSpace = d3.scaleLinear().domain([-spatialDimension/2, spatialDimension/2])
    .range([radiusPlot.attr("x"), +radiusPlot.attr("x")+ +radiusPlot.attr("width")])
ySpace = d3.scaleLinear().domain([-spatialDimension/2, spatialDimension/2])
    .range([radiusPlot.attr("y"), +radiusPlot.attr("y") + +radiusPlot.attr("height")])
x_axis = d3.axisBottom().scale(xSpace);
y_axis = d3.axisLeft().scale(ySpace)

// Energy panel
energyPanel = svg.append("g").attr("id","energyPanel")
energyPlot = energyPanel.append("rect")
    .attr("x", margin+ panelDimension + divider)
    .attr("y",topmargin)
    .attr("height", panelDimension)
    .attr("width", panelDimension)
    .attr("fill", "rgb(250, 250, 250)")
xScale = d3.scaleLinear().domain([0,1])
    .range([energyPlot.attr("x"), +energyPlot.attr("x")+ +energyPlot.attr("width")])
energyScale =  d3.scaleLinear().domain([20, minEnergy])
.range([energyPlot.attr("y"), +energyPlot.attr("y")+ +energyPlot.attr("height")])
energy_axis = d3.axisRight().scale(energyScale)
energyAxis = energyPanel.append("g")
    .attr("transform", "translate("+(margin+2*panelDimension+divider)+",0)").call(energy_axis)
energyAxis.selectAll("text").style("fill", "rgb(150, 150, 150)")
energyAxis.selectAll("path").style("stroke", "rgb(150, 150, 150)")

// Initializing
function Init(){
    electrons = [{"id": 0, "orbital":"1s", "orbitalId":0, "n": 1, "l":0, "scr":0, "zEff":Z, "radius": 1, "theta": Math.PI, "energy": 1, "fCoulNuc":0}]
    occupancy = {"1s":1, "2s":0, "2p":0, "3s":0, "3p":0, "4s":0}
    occupiedShells = ["1s"]
    // iteration 1: adding electrons
    for (let i=1; i<Z; i++) {
        let l
        orbital = orbitalSequence[i]
        if (orbital[1]=="s"){l=0} else {l=1}
        electrons.push({"id": i, "orbital":orbital, "orbitalId": orbitalIds[i], "n": +orbital[0], "l":l, "zEff":Z})
        occupancy[orbital] += 1
        if (occupiedShells.indexOf(orbital)===-1){occupiedShells.push(orbital)}
    }
    
    offsetIndex=0
    // iteration 2: correcting for screening constants, effective nuclear charge, and adding radius
    for (let i=0; i<Z; i++) {
        if (i!=0 && electrons[i].orbital != electrons[i-1].orbital){offsetIndex+=1}
        electrons[i].scr = screeningEquations[electrons[i].orbital](occupancy)
        electrons[i].zEff -= electrons[i].scr
        electrons[i].radius = a0 * electrons[i].n**2/electrons[i].zEff
        electrons[i].fCoulNuc = screenedCoulombicForceNucleus(electrons[i])
        electronsInThisOrbital = occupancy[electrons[i].orbital]
        offset = [Math.PI/2, 0][offsetIndex%2]
        if (electronsInThisOrbital==4){offset += Math.PI/4}
        angle = getAngles(electronsInThisOrbital, offset)[electrons[i].orbitalId]
        electrons[i].theta = angle
    }

    // Disabling non-viable shells as options
    document.querySelectorAll("#orbitalToShowForce option").forEach(opt => {
        if (occupiedShells.indexOf(opt.value) === -1) {
            opt.disabled = true;
            opt.style.display = "none";
        } else {opt.disabled = false; opt.style.display = "block"}
    });
    document.querySelectorAll("#orbitalToShowEnergy option").forEach(opt => {
        if (occupiedShells.indexOf(opt.value) === -1) {
            opt.disabled = true;
            opt.style.display = "none";
        } else {opt.disabled = false; opt.style.display = "block"}
    });

    // extracting and displaying radius
    radius = Math.max(...electrons.map(e => e.radius))
    rIndicator.innerHTML = (radius*1e10).toFixed(3)

    // Updating force to show valence shell
    // let valenceElectron = electrons.filter()
    let valenceShell = electrons.filter((obj)=>obj.radius == radius)[0].orbital
    let force = getNuclearCoulombicForce(valenceShell)
    let valenceEnergy = getTotalEnergy(electrons[Z-1])*joulesToEV
    fSelectMenu.value = valenceShell
    eSelectMenu.value = valenceShell
    fIndicator.innerHTML = (force*1e9).toFixed(1)
    eIndicator.innerHTML = (valenceEnergy).toFixed(1)

    // Graphing
    radiusPanel.selectAll("circle").remove()
    energyPanel.selectAll("line").remove()
    radiusPanel.append("circle")
        .attr("cx", xSpace(0)).attr("cy", ySpace(0))
        .attr("r", xSpace(0.03)-xSpace(0))
        .style("fill", "rgb(100,100,100)")
        .style("stroke-width", 1.5)
    radiusPanel.append("circle")
        .attr("id","highlight")
        .attr("cx", xSpace(0)).attr("cy", ySpace(0))
        .attr("r", xSpace(radius*1e10)-xSpace(0))
        .style("fill", "none")
        .style("stroke", orbitalColors[valenceShell])
        .style("opacity", 0.3)
        .style("stroke-width", 5)
    radiusPanel.selectAll("shells")
        .data(electrons.filter((obj) => obj.orbitalId === 0))
        .enter().append("circle")
        .attr("id", function(d){return d.orbital+"_shell"})
        .attr("cx", xSpace(0)).attr("cy", ySpace(0))
        .attr("r", function(d){return xSpace(d.radius*1e10)-xSpace(0)})
        .style("stroke", function(d){ return orbitalColors[d.orbital]})
        .style("stroke-width", 1)
        .style("fill", "none")
        .style("opacity", 1)
        .on("click", function(d){
            valenceShell = d.orbital
            force = getNuclearCoulombicForce(valenceShell)
            fSelectMenu.value = valenceShell
            fIndicator.innerHTML = (force*1e9).toFixed(1)
            d3.select("#highlight")
                .attr("r", xSpace(d.radius*1e10)-xSpace(0))
                .style("stroke", orbitalColors[d.orbital])
        })
    radiusPanel.selectAll("electronDots")
        .data(electrons)
        .enter().append("circle")
            .attr("cx", function(d){return xSpace(d.radius*1e10*Math.cos(d.theta))})
            .attr("cy", function(d){return ySpace(d.radius*1e10*Math.sin(d.theta))})
            .attr("r", 2.2)
            .style("fill", function(d){ return orbitalColors[d.orbital]})
            .style("stroke", function(d){ return "rgb(20, 20, 20)"})
            .style("stroke-width", 0.5)
            .on("click", function(d){
                activeShell = d.orbital
                force = getNuclearCoulombicForce(activeShell)
                fSelectMenu.value = activeShell
                fIndicator.innerHTML = (force*1e9).toFixed(1)
                d3.select("#highlight")
                    .attr("r", xSpace(d.radius*1e10)-xSpace(0))
                    .style("stroke", orbitalColors[d.orbital])
            })
    energyPanel.append("line")
        .attr("x1", xScale(0)).attr("x2", xScale(1))
        .attr("y1", energyScale(0)).attr("y2",energyScale(0))
        .attr("stroke", "rgb(0,0,0)")
        .attr("stroke-dasharray", "4,2")
    energyPanel.append("line")
        .attr("id", "highlightE")
        .attr("x1", xScale(0)).attr("x2", xScale(1))
        .attr("y1", energyScale(getTotalEnergy(electrons.filter((obj)=>obj.orbital==valenceShell && obj.orbitalId==0)[0])*joulesToEV))
        .attr("y2",energyScale(getTotalEnergy(electrons.filter((obj)=>obj.orbital==valenceShell && obj.orbitalId==0)[0])*joulesToEV))
        .style("stroke", orbitalColors[valenceShell])
        .style("opacity", 0.3)
        .style("stroke-width", 5)
    energyPanel.selectAll("energyLines")
        .data(electrons.filter((obj) => obj.orbitalId === 0))
        .enter().append("line")
        .attr("x1", xScale(0)).attr("x2", xScale(1))
        .attr("y1", function(d){
            return energyScale(getTotalEnergy(d)*joulesToEV)
            })
        .attr("y2", function(d){
            return energyScale(getTotalEnergy(d)*joulesToEV)
            })
        .attr("stroke", function(d){
            return orbitalColors[d.orbital]
        })
        .style("visibility", function(d){
            if(getTotalEnergy(d)*joulesToEV > minEnergy){
                return "visible"} else {return "hidden"}
            })
        .on("click", function(d){
            electron = electrons.filter((obj)=>obj.orbital==d.orbital && obj.orbitalId==0)[0]
            activeShell = electron.orbital
            energy = getTotalEnergy(electron)*joulesToEV
            eSelectMenu.value  = activeShell
            eIndicator.innerHTML = (energy).toFixed(1)
            d3.select("#highlightE")
                .attr("y1", energyScale(energy)).attr("y2", energyScale(energy))
                .style("stroke", orbitalColors[activeShell])
                .style("visibility", function(d){
                    if(energy > minEnergy){
                        return "visible"} else {return "hidden"}
                    })
        })
    
}

Init()

// Functions
function getAngles(number, offset=0){
    angles = []
    for (let i=0; i<number; i++){
        angles.push(2*Math.PI/number*i+offset)
    }
    return angles
}

function coulombicForceNucleus(electron) {
    return Z*qE**2/(4*Math.PI*e0*electron.radius**2)
}

function screenedCoulombicForceNucleus(electron) {
    return electron.zEff*qE**2/(4*Math.PI*e0*electron.radius**2)
}

function coulombicRepulsionByElectron(electron1, electron2) {
    // returns a vector of the repulsion force on electron 1
    x1 = electron1.radius*Math.cos(electron1.theta)
    y1 = electron1.radius*Math.sin(electron1.theta)
    x2 = electron2.radius*Math.cos(electron2.theta)
    y2 = electron2.radius*Math.sin(electron2.theta)
    dx = x1-x2; dy = y1-y2
    distance = Math.sqrt(dx**2+dy**2)
    fC = qE**2/(4*Math.PI*e0*distance**2)
    fCx = fC*dx/distance; fCy=fC*dy/distance
    normalVector = [Math.cos(electron1.theta), Math.sin(electron1.theta)]
    tangentVector = [-normalVector[1], normalVector[0]]
    forceVector = [fCx, fCy]
    alongNormal = normalVector[0]*forceVector[0]+normalVector[1]*forceVector[1]
    alongTangent = tangentVector[0]*forceVector[0]+tangentVector[1]*forceVector[1]
    return [alongNormal, alongTangent]
}

function coulombicRepulsionByShell(electron, shell) {
    // get average repulsion across the circle of the shell
    let rShell = electrons.filter((obj)=>obj.orbital==shell)[0].radius
    // integration
    step=Math.PI/25
    fNormal = 0
    for (let theta=0; theta<2*Math.PI+step; theta += step) {
        let el2 = {"radius":rShell, "theta":theta}
        result = coulombicRepulsionByElectron(electron, el2)
        fNormal += result[0]
    }
    fNormal /= 2*Math.PI/step
    return fNormal
}

function getNuclearCoulombicForce(shell) {
    let electron = electrons.filter((obj) => obj.orbital == shell)[0]
    return screenedCoulombicForceNucleus(electron)
}

function getCoulombicRepulsionFromShells(electron, shells) {
    // considers individual electrons for same shell, and average force for other shells
    let fNormal=0, fTangent=0
    // let electronsInSameShell = electrons.filter((obj)=>obj.orbital==electron.orbital && obj != electron)
    //     electronsInSameShell.forEach(function(e){
    //     let result=coulombicRepulsionByElectron(electron, e)
    //     fNormal += result[0]
    //     fTangent += result[1]
    // })
    // otherShells = shells.filter((s)=>s !== electron.orbital)
    // otherShells.forEach(function(shell){
    //     fNormal += coulombicRepulsionByShell(electron, shell)*occupancy[shell]
    // })
    // get electrons belonging to shells in list
    electronsConsidered = electrons.filter((obj)=>shells.indexOf(obj.orbital) != -1 && obj !=electron)
    electronsConsidered.forEach(function(e){
        let result=coulombicRepulsionByElectron(electron, e)
        fNormal += result[0]
        fTangent += result[1]
    })
    return [fNormal, fTangent]
}


function getEPE(electron) {
    // getting the shell including the electrons and all the ones further in
    let shells = occupiedShells //.slice(0,occupiedShells.indexOf(electron.orbital)+1)
    let repulsion = getCoulombicRepulsionFromShells(electron, shells)[0]
    let attraction = coulombicForceNucleus(electron)
    let netForce = repulsion - attraction
    // from force to potential energy
    return netForce*electron.radius
}

function getKE(electron) {
    let potentialEnergy = getEPE(electron)
    // using the radius the electron would have if all its potential energy was due to the nucleus
    let effectiveRadius = -1/(4*Math.PI*e0)*electron.zEff*qE**2/potentialEnergy
    return 1/(4*Math.PI*e0)*electron.zEff*qE**2/(2*effectiveRadius) + (electron.l*(electron.l+1))*hbar**2/(2*mE*effectiveRadius**2)
    // return (electron.n**2 + electron.l*(electron.l+1))*hbar**2/(2*mE*effectiveRadius**2)
}

function getTotalEnergy(electron){
    return getEPE(electron)+getKE(electron)
}

// Functions for interface
d3.select("#removeZ").on("click", function(){
    Znew = Z-1
    Z = Znew
    zIndicator.innerHTML = Z
    Init()
    if (Znew==1){
        removeZ.disabled=true
    }
    if (addZ.disabled){addZ.disabled=false}
})

d3.select("#addZ").on("click", function(){
    Znew = Z + 1
    Z = Znew
    zIndicator.innerHTML = Z
    Init()
    if (removeZ.disabled){removeZ.disabled=false}
    if (Znew==20){addZ.disabled=true}
})

d3.select("#orbitalToShowForce").on("change", function(){
    let shell = fSelectMenu.value
    let force = getNuclearCoulombicForce(shell)
    let radius = electrons.filter((obj) => obj.orbital == shell)[0].radius
    fIndicator.innerHTML = (force*1e9).toFixed(1)
    d3.select("#highlight")
        .attr("r", xSpace(radius*1e10)-xSpace(0))
        .style("stroke", orbitalColors[shell])
})

d3.select("#orbitalToShowEnergy").on("change", function(){
    let shell = eSelectMenu.value
    let energy = getTotalEnergy(electrons.filter((obj)=>obj.orbital==shell && obj.orbitalId==0)[0])*joulesToEV
    eIndicator.innerHTML = (energy).toFixed(1)
    d3.select("#highlightE")
        .attr("y1", energyScale(energy)).attr("y2", energyScale(energy))
        .style("stroke", orbitalColors[shell])
        .style("visibility", function(d){
            if(energy > minEnergy){
                return "visible"} else {return "hidden"}
            })
})