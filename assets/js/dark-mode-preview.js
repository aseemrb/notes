document.addEventListener("DOMContentLoaded", function () {
  const toggleDarkMode = document.querySelector(".js-toggle-dark-mode");
  const cssFile = document.querySelector('[rel="stylesheet"]');
  const originalCssRef = cssFile.getAttribute("href");
  const darkModeCssRef = originalCssRef.replace(
    "just-the-docs.css",
    "dark-mode-preview.css"
  );
  const buttonCopy = ["Lights On", "Lights Off"];
  const updateButtonText = function (toggleDarkMode) {
    toggleDarkMode.textContent === buttonCopy[0]
      ? (toggleDarkMode.textContent = buttonCopy[1])
      : (toggleDarkMode.textContent = buttonCopy[0])
  };

  if (sessionStorage.mode == "dark") {
    cssFile.setAttribute("href", darkModeCssRef);
    updateButtonText(toggleDarkMode);
  }

  jtd.addEvent(toggleDarkMode, "click", function () {
    if (cssFile.getAttribute("href") === originalCssRef) {
      cssFile.setAttribute("href", darkModeCssRef)
      sessionStorage.mode = "dark";
      updateButtonText(toggleDarkMode);
    } else {
      cssFile.setAttribute("href", originalCssRef)
      sessionStorage.mode = "light";
      updateButtonText(toggleDarkMode);
    }
  })
})
