let eGainUI;

async function loadjQuery() {
  try {
      const response = await fetch('https://code.jquery.com/jquery-3.7.1.min.js');
      const script = await response.text();

      // Create a script element and append jQuery code
      const scriptElement = document.createElement('script');
      scriptElement.textContent = script;
      
      // Append the script element to the document's head
      document.head.appendChild(scriptElement);
  } catch (error) {
      console.error('Error loading jQuery:', error);
  }
}

(async () => {
await loadjQuery();
   eGainUI = jQuery.noConflict(true);
     // jQuery has been loaded, and eGainUI is assigned with jQuery.noConflict(true)
  // You can use eGainUI instead of $ to avoid conflicts with other libraries
  (function () {
      eGainUI(document).ready(function () {
        let widgetData = document.getElementById("egain-widget-script").dataset;
    const{egainPortalId,egainLocale,egainTemplateName,egainDomainHint,egainUserType,widgetDomain,egainClientId,egainRedirectUri,egainRegion} = widgetData;
         const domain = `https://${widgetDomain}/Add path where the widget is deployed`;
         //const domain = `https://${widgetDomain}/system/templates/selfservice/custom`;

        const widgetStyles = eGainUI("<link>", {
          rel: "stylesheet",
          type: "text/css",
          href: domain + "/widget/style.css",//path to widget style
        });
        eGainUI("head").append(widgetStyles);
        const modalHtmlURL = domain + "/widget/egain_modal/modal.html?egainPortalId=" + egainPortalId + "&egainLocale=" + egainLocale + "&egainTemplateName=" + egainTemplateName + "&egainDomainHint=" + egainDomainHint + "&egainUserType=" + egainUserType + "&egainRegion=" + egainRegion + "&egainWidgetDomain=" + widgetDomain +  "&egainClientId=" + egainClientId + "&egainRedirectUri=" + egainRedirectUri; ;
    
    
        // Create and style the button element
        const $button = eGainUI("<button>", {
          text: egModalOpenLabel,
          class: "eg-widget-open " + egModalPosition,
          id: "eg-widget-open",
          style: "display: none",
          type: "button"
        });
    // Create the modal container
    const $modal = eGainUI("<div>", {
      id: "eg-widget-modal",
      class: "eg-widget-modal eg-collapse " + egModalPosition,
      style: "display: none"
    });

    // Create the modal content
    $modalContent = eGainUI("<div>", {
      id: "eg-widget-modal-content",
      class: "modal-content",
      style: "overflow: hidden; height: 100%"
    });

    const innerContent = `
      <div class="eg-widget-header" style="overflow: hidden">
          <div class="knowledge-search-title" id="eg-modal-title">${egHeaderTitle}</div>
          <div class="eg-header-icons">
          <span id="toggle-modal-position" class="eg-modal-toggle" onclick=toggleModalPosition()><i class="fas fa-exchange-alt"></i></span>
            <span id="eg-modal-close" class="eg-modal-close"><i class="fas fa-chevron-down"></i></span>
            <!-- <span id="eg-modal-expand" class="eg-modal-expand" onclick=expandModal()><i class="fas fa-solid fa-expand"></i></span> -->
            <!-- <span id="eg-modal-collapse" class="eg-modal-collapse" onclick=collapseModal()><i class="fas fa-minus"></i></span> -->
          </div>
      </div>
      <div style="height: calc(100% - 80px)">
        <iframe title="${egHeaderTitle}" src="${modalHtmlURL}"  width="100%" height="100%" style="border: none"></iframe>
      </div>
    `;
    $modalContent.append(innerContent);

  // Attach the $modalContent to the widget header
  const widgetHeader = eGainUI(".eg-widget-header");
  widgetHeader.append($modalContent);
    
        // Append elements to the DOM
        $modal.append($modalContent);
        eGainUI("body").append($button);
        eGainUI("body").append($modal);
    
        // Function to open the modal
    
        function openModal() {
          $modal.css("display", "block");
          $button.css("display", "none");
        }
    
        // Function to close the modal
        function closeModal() {
          $modal.css("display", "none");
          $button.css("display", "block");
        }
    
        function expandModal() {
          let toggleClasses = Array.from(
            document.getElementsByClassName("eg-collapse")
          );
          toggleClasses.forEach((element) => {
            element.classList.remove("eg-collapse");
            element.classList.add("eg-expand");
          });
        }
    
        function collapseModal() {
          let toggleClasses = Array.from(
            document.getElementsByClassName("eg-expand")
          );
          toggleClasses.forEach((element) => {
            element.classList.remove("eg-expand");
            element.classList.add("eg-collapse");
          }
          );
        }
        // Add click event listeners
        $button.on("click", openModal);
        eGainUI("#eg-modal-close").on("click", closeModal);
        eGainUI("#eg-modal-expand").on("click", expandModal);
        eGainUI("#eg-modal-collapse").on("click", collapseModal);
        eGainUI(window).on("click", function (event) {
          if (event.target === $modal[0]) {
            closeModal();
          }
        });
      });
  })();

})();

/**
 * The below code is used to toggle the modal position from left to right and vice versa.
 * @function toggleModalPosition
 */

function toggleModalPosition() {
  let toggleClasses = Array.from(
    document.getElementsByClassName(egModalPosition)
  );
  let egModalPositionOld = egModalPosition;
  egModalPosition = egModalPosition === "left" ? "right" : "left";
  toggleClasses.forEach((element) => {
    element.classList.remove(egModalPositionOld);
    element.classList.add(egModalPosition);
  });
}
// The below code is used to get the data from the parent window and set the data to the widget
// Declare and set default values for configurations, these will be overridden by the config file values

let egModalPosition = "left"; // 'left' or 'right' to set starting modal position
let egHeaderTitle = "eGain Knowledge Search";
let egModalOpenLabel = "Search in Help";
let $modalContent = "";

 
/**
 * The below code is used to get the data from the parent window and set the data to the widget.
 * @function handleMessageEvent
 * @param {MessageEvent} event - The message event object.
 */
 window.addEventListener('message', event => {
  if (event.data && typeof event.data === 'string') {
    let data = event.data.split('::');
    if (data.length === 2) {
      switch (data[0]) {
        case 'egHeaderTitle':
          egHeaderTitle = data[1];
          eGainUI('#eg-modal-title').html(data[1]);
          break;
        case 'egModalOpenLabel':
          egModalOpenLabel = data[1];
          eGainUI('#eg-widget-open').html(data[1]);
          break;
        case 'egModalPosition':
          if (data[1] === 'left' || data[1] === 'right') {
            egModalPosition = data[1];
            eGainUI("#eg-widget-modal").removeClass("left right");
            eGainUI("#eg-widget-modal").addClass(data[1]);
            eGainUI("#eg-widget-open").removeClass("left right");
            eGainUI("#eg-widget-open").addClass(data[1]);
          }
          break;
        case 'egModalWidth':
          document.documentElement.style.setProperty("--eg-modal-width", data[1]);
          break;
        case 'egBrandingColor':
          document.documentElement.style.setProperty("--eg-branding-color", data[1]);
          break;
        case 'egHeaderFooterTextColor':
          document.documentElement.style.setProperty("--eg-header-footer-text-color", data[1]);
          break;
        case 'egHeaderFont':
          document.documentElement.style.setProperty("--eg-header-font", data[1]);
          break;
        case 'egHeaderFontSize':
          document.documentElement.style.setProperty("--eg-header-font-size", data[1]);
          break;
        case 'egLoaded':
          eGainUI('#eg-widget-open').show();
          break;
      }
    }
  }
});
