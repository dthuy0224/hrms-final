$(document).ready(function() {
    // Toggle sidebar
    $("#menu-toggle").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled");
        localStorage.setItem('sidebarState', $("#wrapper").attr('class'));
    });
    
    $("#menu-toggle-2").click(function(e) {
        e.preventDefault();
        $("#wrapper").toggleClass("toggled-2");
        localStorage.setItem('sidebarState', $("#wrapper").attr('class'));
    });
    
    // Restore sidebar state
    var sidebarState = localStorage.getItem('sidebarState');
    if (sidebarState) {
        $("#wrapper").attr('class', sidebarState);
    }
    
    // Hide all submenu elements
    $('#menu ul').hide();
    
    // Show submenu for active items
    if ($('#menu li.active ul').length > 0) {
        $('#menu li.active ul').show();
    }
    
    // Handle menu click events
    $('#menu li a').click(function() {
        var checkElement = $(this).next();
        
        // Allow navigation if link doesn't have submenu
        if(!checkElement.is('ul')) {
            return true;
        }
        
        // Toggle submenu visibility
        if (checkElement.is(':visible')) {
            checkElement.slideUp('normal');
            return false;
        }
        
        if (!checkElement.is(':visible')) {
            $('#menu ul:visible').slideUp('normal');
            checkElement.slideDown('normal');
            return false;
        }
    });
    
    // Fix sidebar height when scrolling - applies to all pages with sidebar
    function adjustSidebarHeight() {
        var documentHeight = $(document).height();
        var windowHeight = $(window).height();
        var sidebarHeight = Math.max(documentHeight, windowHeight);
        $("#sidebar-wrapper").css("min-height", sidebarHeight + "px");
    }
    
    // Run on page load
    adjustSidebarHeight();
    
    // Run when window is resized
    $(window).resize(function() {
        adjustSidebarHeight();
    });
    
    // Run when scrolling
    $(window).scroll(function() {
        adjustSidebarHeight();
    });
});