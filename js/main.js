//main javascript file
var source = $('#txt').attr('data-text');
var dest = $('#textHolder');

function typeWriter(text, n) {
    if (n < (text.length)) {
        dest.html(text.substring(0, n+1));
        n++;
        setTimeout(function() {
            typeWriter(text, n)
        }, 100);
    }
}

//call the function when HTML doc is ready
$(document).ready(typeWriter(source, 0));
