$("#nav").load("/menu.html", setTimeout(()=>{
    $(
    '<div id="navPanel">' +
        '<nav>' +
            $('#nav').navList() +
        '</nav>' +
    '</div>'
    )
    .appendTo($("body"))
    .panel({
        delay: 2000,
        hideOnClick: true,
        hideOnSwipe: true,
        resetScroll: true,
        resetForms: true,
        side: 'left',
        target: $("body"),
        visibleClass: 'navPanel-visible'
    });
}, 500))