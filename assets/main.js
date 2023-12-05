function scrollSmoothTo(elementId) {
  var element = document.getElementById(elementId);
  element.scrollIntoView({
    block: 'start',
    behavior: 'smooth'
  });
}




document.addEventListener("DOMContentLoaded", function () {
  const links = document.querySelectorAll('a');

  links.forEach(link => {
    // Check if the href starts with "http" or "https://"
    if (link.getAttribute('href') && link.getAttribute('href').startsWith('http')) {
      link.setAttribute('target', '_blank'); // Open in a new tab
      link.setAttribute('rel', 'noopener noreferrer'); // Security measures
    }
  });
});