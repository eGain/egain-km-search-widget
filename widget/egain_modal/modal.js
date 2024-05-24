
const eGainUI = jQuery.noConflict(true);

eGainUI.callBackName = "eGainUI.callback";
eGainUI.tokenStorageName = "egV3Authorization";
const storagePrefix = "v3-km-widget"

eGainUI.getItem = function () {
  return document.getElementById("eg-search-field-widget-id");
};

eGainUI.getItemAttr = function (item, attr, defaultValue) {
  let ret = "";
  if (item && typeof attr === "string") {
    ret = eGainUI(item).attr(attr) || defaultValue;
  } else if (!item && typeof attr === "string") {
    item = eGainUI.getItem();
    ret = eGainUI(item).attr(attr) || defaultValue;
  }
  return ret;
};

eGainUI.getItemSearchParam = function (item) {
  return eGainUI.getItemAttr(item, "data-egain-search-param", "");
};


let config = {};
let retryCount = 0;
let isConfigsApplied = false;
let gatewayTenantId = '';
let signUpSignInB2CPolicyAuthorityDomain = '';
let maxListSize = 5;
let placeholderText = "Ask eGain";
let surveyLink = "#";
let $modalContent = "";
let params = {};
let scope = '';
let v3apidomain = '';

// Create a token storage object
const createTokenStorage = () => {
  let accessToken;
  let refreshToken;

  function setTokens(newAccessToken, newRefreshToken) {
    accessToken = newAccessToken;
    refreshToken = newRefreshToken;
    console.log("token updated ");
  }

  function getAccessToken() {
    return accessToken;
  }

  function getRefreshToken() {
    return refreshToken;
  }

  return {
    setTokens,
    getAccessToken,
    getRefreshToken,
  };
};

if (window.location.search) {
  window.location.search.substring(1).split('&').forEach(param => {
    let parsedParam = param.split('=');
    if (parsedParam.length > 1) {
      const key = parsedParam[0];
      const value = parsedParam[1];
      params[key] = value;
    }
  });
}
let isAccordionOpen = false; // initialize as false, do not change

// Initialize the token storage
const tokenStorage = createTokenStorage();
if(params.egainRegion === 'emea' || params.egainRegion === 'EMEA'){
  console.log('inside emea');
  signUpSignInB2CPolicyAuthorityDomain = 'login-emea.egain.cloud';
  gatewayTenantId = '038c150c-eb26-453a-8e19-86a8611548a9';
  scope = "https://api-emea.egain.cloud/auth/knowledge.portalmgr.manage";
  v3apidomain = 'api-emea.egain.cloud';
}
else{

  signUpSignInB2CPolicyAuthorityDomain = 'login.egain.cloud';
  gatewayTenantId = 'f51302dd-7036-41b5-b619-e1a52a67c780';
  scope = "https://api.egain.cloud/auth/knowledge.portalmgr.manage";	
  v3apidomain = 'api.egain.cloud';
}
const signUpSignInB2CPolicyName = 'B2C_1A_User_V3_SignIn_OIDC';
const signUpSignInB2CAuthority = `https://${signUpSignInB2CPolicyAuthorityDomain}/${gatewayTenantId}/${signUpSignInB2CPolicyName}`;
const msalAuthClientId = params.egainClientId;
const requestRedirectUri = params.egainRedirectUri;
const domainHint = params.egainDomainHint;
const apiConfig = {
    b2cScopes: [
      scope
    ]
};
const tokenRequest = {
    scopes: [...apiConfig.b2cScopes],
    extraQueryParameters: { domain_hint: domainHint },
    forceRefresh: false // Set this to "true" to skip a cached token and go to the server to get a new token
};

const b2cPolicies = {
    names: {
        signUpSignIn: signUpSignInB2CPolicyName,
    },
    authorities: {
        signUpSignIn: {
            authority: signUpSignInB2CAuthority,
        },
    },
    authorityDomain: signUpSignInB2CPolicyAuthorityDomain,
};
const msalConfig = {
    auth: {
        clientId: msalAuthClientId, // This is the ONLY mandatory field; everything else is optional.
        authority: b2cPolicies.authorities.signUpSignIn.authority, // Choose sign-up/sign-in user-flow as your default.
        knownAuthorities: [b2cPolicies.authorityDomain], // You must identify your tenant's domain as a known authority.
        redirectUri: requestRedirectUri,
        //redirectUri: 'https://eg5548ain.ezdev.net/system/web/apps/resources/js/msalsso.html', // You must register this URI on Azure Portal/App Registration. Defaults to "window.location.href".
    },
    cache: {
        cacheLocation: 'sessionStorage', // Configures cache location. "sessionStorage" is more secure, but "localStorage" gives you SSO between tabs.
        storeAuthStateInCookie: false, // If you wish to store cache items in cookies as well as browser cache, set this to "true".
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case msal.LogLevel.Error:
                        console.error(message);
                        return;
                    case msal.LogLevel.Info:
                        console.info(message);
                        return;
                    case msal.LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case msal.LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            },
        },
    },
};


const myMSALObj = new msal.PublicClientApplication(msalConfig);


let accountId = '';
let username = '';

function setAuthorization(response) {
    if (response) {
        const authToken = {
            Authorization: response.accessToken
                ? response.accessToken
                : response.idToken,
            tenantId:
                response.idTokenClaims['http://egain.net/claims/identity/tenant']
        };
        sessionStorage.setItem('authData', JSON.stringify({ data: authToken }));
        sessionStorage.setItem(`${storagePrefix}_accessToken`, authToken.Authorization)
        return authToken;
    }
    return {};
}

function setAccount(account) {
    accountId = account.homeAccountId;
    username = account.username;
    sessionStorage.setItem('user', username);
}

function setCurrentAccount(currentAccounts) {
    if (currentAccounts.length > 1) {
        const resAccounts = currentAccounts.filter(account =>
            account.homeAccountId.toUpperCase().includes(b2cPolicies.names.signUpSignIn.toUpperCase()) &&
            account.idTokenClaims.iss.toUpperCase().includes(b2cPolicies.authorityDomain.toUpperCase()) &&
            account.idTokenClaims.aud === msalConfig.auth.clientId
        );

        if (resAccounts.length > 1) {
            if (resAccounts.every(account => account.localAccountId === resAccounts[0].localAccountId)) {
                setAccount(resAccounts[0]);
            } else {
                // Multiple users detected. Logout all to be safe.
                // signOut();
                // you can select which account application should sign out
            }
        } else if (resAccounts.length === 1) {
            setAccount(resAccounts[0]);
        }
    } else if (currentAccounts.length === 1) {
        setAccount(currentAccounts[0]);
    }
}

async function B2cLogin() {
    const currentAccounts = myMSALObj.getAllAccounts();
    const accounts = currentAccounts.filter(
        (account) =>
            account.homeAccountId
                .toUpperCase()
                .includes(b2cPolicies.names.signUpSignIn.toUpperCase()) &&
            account.idTokenClaims.iss
                .toUpperCase()
                .includes(b2cPolicies.authorityDomain.toUpperCase()) &&
            account.idTokenClaims.aud === msalConfig.auth.clientId
    );
    return new Promise((resolve, reject) => {
        function signIn(accounts) {
            myMSALObj
                .loginPopup(tokenRequest)
                .then(data => {
                    if (data !== null) {
                        setAccount(data.account);
                    } else {
                        selectAccount(accounts);
                    }

                    getToken().then(response => {
                        resolve({ data: response });
                    });
                })
                .catch(error => {
                    reject({ data: error });
                });

            myMSALObj.handleRedirectPromise();
        }

        function selectAccount() {

            if (currentAccounts.length < 1) {
                signIn(accounts);
            } else {
                setCurrentAccount(currentAccounts);
            }
        }

        selectAccount(accounts);

        if (sessionStorage.getItem('user') === username) {
            getToken()
                .then(response => {
                    resolve({ data: response });
                })
                .catch(error => {
                    reject({ data: error });
                });
        }
    })
}

async function getToken() {
    if (!accountId) {
        const accounts = myMSALObj.getAllAccounts();
        setCurrentAccount(accounts);
        if (!accountId) {
            throw new Error(
                'No active account! Verify a user has been signed in and setActiveAccount has been called.'
            );
        }
    }

    const account = myMSALObj.getAccountByHomeId(accountId) || undefined;
    console.log("tokenRequest", tokenRequest)
    try {
        const response = await myMSALObj.acquireTokenSilent({
            account: account,
            ...tokenRequest
        });
        if (
            (!response.accessToken || response.accessToken === '') &&
            (!response.idToken || response.idToken === '')
        ) {
            throw new msal.InteractionRequiredAuthError();
        }
        return setAuthorization(response);
    } catch (error) {
      console.log('error in get token',error);
        if (error instanceof msal.InteractionRequiredAuthError) {
            const response = await myMSALObj.acquireTokenPopup(tokenRequest);
            return setAuthorization(response);
        } else {
            console.log('error in get token',error);
        }
    }
}



/*
 * Following function was copied from ApplicationConfigurationService for Econet.
 * Hence should be kept in sync with the same function.
 * @param {type} string
 * @returns {unresolved}
 */

// Function to prettify a string into a URL-friendly format
eGainUI.Prettify = function (string) {
  const url = string
    .replace(/^\s+|\s+$/g, "") /* trim leading and trailing spaces */
    .replace(
      /[_|\s]+/g,
      "-"
    ) /* change all spaces and underscores to a hyphen */
    .replace(
      /[^a-z0-9-]+/gi,
      ""
    ) /* remove all non-alphanumeric characters except the hyphen */
    .replace(
      /[-]+/g,
      "-"
    ) /* replace multiple instances of the hyphen with a single instance */
    .replace(/^-+|-+$/g, "") /* trim leading and trailing hyphens */
    .replace(/%/g, ""); /* remove all % signs from the name */
  return url;
};

eGainUI.Portals = {};
eGainUI.PortalsTried = {};

eGainUI.getPortal = function (item) {
  let portal = null;
  const portalId = params.egainPortalId;
  if (portalId) {
    portal = eGainUI.Portals[portalId];
  }
  return portal;
};

eGainUI.isAlternateIdEnabled = function (item) {
  const portal = eGainUI.getPortal(item);
  const ret = portal ? portal.portalSettings.showAlternateId : false;
  return ret;
};

eGainUI.getPortalDetails = function (item, callback) {
  const portalId = params.egainPortalId;
  const portal = eGainUI.Portals[portalId];
  let apiCalled = eGainUI.PortalsTried[portalId];
  if (!apiCalled) {
    apiCalled = eGainUI.PortalsTried[portalId] = eGainUI.ajaxRequest({
      url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}`,
    });
  }
  if (typeof callback === "function") {
    apiCalled.done((data) => {
      eGainUI.Portals[portalId] =
        data && data.portal && data.portal.length >= 1 ? data.portal[0] : null;
      callback(eGainUI.Portals[portalId]);
    });
  }
  return portal;
};


/**
 * Retrieves the URL of the item template based on the provided item.
 * @param {HTMLElement} item - The item element.
 * @returns {string} - The URL of the item template.
 */
eGainUI.getItemTemplateUrl = function (item) {
  let retUrl = "";
  if (item) {
    retUrl = `https://${params.egainDomainHint}/system/templates/selfservice/${
      params.egainTemplateName
    }/help/${
      params.egainUserType
    }/locale/${
      params.egainLocale
    }/portal/${params.egainPortalId}`;
  }
  return retUrl;
};

eGainUI.getItemTemplateArticlePageUrl = function (item, data, options, type) {
  let retUrl = "";
  if (item && data) {
    const id =
      (options && options.isAlternateIdEnabled && data.alternateId) ||
        type !== "suggestion"
        ? data.alternateId
        : data.id;

    const articleName = type === "suggestion" ? data.suggestion : data.name;
    retUrl = `${eGainUI.getItemTemplateUrl(
      item
    )}/content/${id}/${eGainUI.Prettify(articleName)}`;
    if (options && options.queryParams) {
      retUrl += "?";
      Object.keys(options.queryParams).forEach((key, index) => {
        retUrl +=
          index === Object.keys(options.queryParams).length - 1
            ? `${key}=${options.queryParams[key]}`
            : `${key}=${options.queryParams[key]}&`;
      });
    }
  }
  return retUrl;
};

/*
 * This function is called in case of 401 or 412 error codes returned by WS APIs.
 */
eGainUI.unauthorizedCallback = async function (data, textStatus, errorThrown) {
  // Check if the license is consumed
  try{
  const serverResponse = JSON.parse(data.responseText);
  let serverErrorMsg = "";
  if (
    serverResponse &&
    serverResponse.callInfo &&
    serverResponse.callInfo.message
  ) {
    serverErrorMsg = serverResponse.callInfo.message;
  }

  // If the user hit the MAX license consumption limit, show 'server busy' message
  if (serverErrorMsg.indexOf("License not assigned") !== -1) {
    alert("SERVER_BUSY");
  }
  // If not then just resubmit the request again, which will start a new session
  else {
    console.error("Token expired, reload the page");
    const userType = params.egainUserType;
    if (userType === "agent") {
      if (retryCount === 0) {
        await refreshAuthenticatedSession();
      }
    } else {
      await getAnonymousCustomerSession();
    }
    this.headers.Authorization = `Bearer ${tokenStorage.getAccessToken()}`;
    await eGainUI.ajaxRequest(this);
  }
}catch(err){
console.log('error occured',err);
}
};

eGainUI.ajaxRequest = function (settings) {
  // If the settings object is null/undefined then set it to empty object
  if (typeof settings === "undefined") {
    settings = {};
  }
  // Request data
  const ajaxSettings = {};

  // Request URL
  if (!settings.url) {
    throw new Error("settings.url is not specified !!!");
  }
  ajaxSettings.url = settings.url;

  // Set context for all the ajax callbacks.
  ajaxSettings.context = settings.context;

  // Request type (usually GET or POST)
  ajaxSettings.type = settings.type || settings.method || "GET";

  if (settings.data) {
    if (ajaxSettings.type === "GET") {
      const keys = Object.keys(settings.data);
      let url = `${ajaxSettings.url}?`;
      keys.forEach((key) => {
        url += `${key}=${settings.data[key]}&`;
      });
      url = url.slice(0, -1); // remove last &
      ajaxSettings.url = url;
    } else {
      ajaxSettings.data = settings.data;
    }
  }

  const defaultHeaders = {
    Authorization: `Bearer ${tokenStorage.getAccessToken()}`,
    Accept: "application/json",
    "Accept-Language": params.egainLocale,
  };
  ajaxSettings.headers = eGainUI.extend({}, defaultHeaders, settings.headers);

  // Status Code Callbacks
  const statusCode = {};

  // Success Codes
  const successCodes = (settings.successCodes &&
    [200].concat(settings.successCodes)) || [200];
  for (var i in successCodes) {
    var code = successCodes[i];
    statusCode[code] = settings.success;
  }

  // Error Codes
  const errorCodes = (settings.errorCodes &&
    [404].concat(settings.errorCodes)) || [404];
  for (var i in errorCodes) {
    var code = errorCodes[i];
    statusCode[code] = settings.error;
  }

  /*
   * Take care of 401 response (unauthorized access) or 412 (precondition failed)
   * Use the passed in handlers if available.
   */
  statusCode[401] = statusCode[401] || eGainUI.unauthorizedCallback;
  statusCode[412] = statusCode[412] || eGainUI.unauthorizedCallback;

  ajaxSettings.statusCode = statusCode;

  ajaxSettings.traditional = true;

  // Array of functions to be executes on request completion
  ajaxSettings.complete = [];
  // For single function
  if (typeof settings.complete === "function") {
    ajaxSettings.complete.push(settings.complete);
  }
  // For array of functions
  else if (
    typeof settings.complete !== "undefined" &&
    eGainUI.isArray(settings.complete)
  ) {
    ajaxSettings.complete = ajaxSettings.complete.concat(settings.complete);
  }

  /*
   * If we know eGain sessionID, use it in the request. Otherwise,
   * record it from the response.
   */
  /*
   * For chat application session Id is not required
   * Hence, the request can be asynchronous
   */
  ajaxSettings.async = true;

  return eGainUI.ajax(ajaxSettings);
};

(function (eGainUI) {
  eGainUI.fn.SearchFieldWidget = function (
    searchString,
    callback,
    callAutoCompleteAPI,
    isFirstLoadedWidget
  ) {
    const searchTerm = searchString || "";
    this.each(function (index, item) {
      if (!callAutoCompleteAPI || isFirstLoadedWidget) {
        eGainUI(this).html("");
      }
      const successCallback = function (data) {
        var searchWidgetInput = eGainUI("<input>", {
          type: "search",
          value: searchTerm,
          id: `eGain-Search-Field-Input-text-${index}`,
          class: "eGain-Search-Field-Input-text",
          title: "Search",
          placeholder: placeholderText,
        })
          .on("input", function () {
            eGainUI.isEnterKeyPressed = false;
            const val = eGainUI(searchWidgetInput).val();
            if (val && val.trim() && val.length > 0) {
              
              eGainUI(".eGain-Search-Field-Input-button").hide();
              eGainUI(".eGain-Search-Field-Reset-button").show();
              searchString = val.charAt(0).toUpperCase() + val.slice(1);
              eGainUI(searchWidgetInput).val(searchString);
              eGainUI(item).SearchFieldWidget(searchString, callback, true);
            } else if (!val && val !== "") {
              eGainUI(".eGain-Search-Field-Reset-button").show();
              if (
                eGainUI(item).find(".eGain-Search-Sugession-Field-Results-h1")
                  .length
              ) {
                eGainUI(".eGain-Search-Result-Field-Header").remove();
                eGainUI(".eGain-Search-Result-Field-Results-Ul").remove();
              } else {
                eGainUI(".eGain-Search-Results-Ul").remove();
                eGainUI(".eGain-Search-Field-Results-Ul").remove();
              }
            } else if (val === "") {
              eGainUI(".eGain-Search-Field-Reset-button").hide();
              eGainUI("[data-egain-role~='popular-articles']").show();
              eGainUI(".eGain-Search-Result-Field-Results-Ul").remove();
              eGainUI(".eGain-Search-Result-Field-Header").remove();
              eGainUI(".eGain-Search-Sugesstion-Result-Field-Header").remove();
              eGainUI(
                ".eGain-Search-Result-Sugession-Field-Results-Ul"
              ).remove();
              eGainUI(item).SearchFieldWidget("", callback, false, true);
            }
          })
          .keypress((event) => {
            if (event.which === 13) {
              collapseAllAccordions();
              eGainUI(item).SearchFieldWidget(
                eGainUI(searchWidgetInput).val(),
                callback
              );
            }
          })
          .on("blur", function () {
            //eGainUI(".eGain-Search-Suggetion-Results-Ul").remove();
          });
        eGainUI(item).append(searchWidgetInput);

        const searchResetButton = eGainUI("<button>", {
          id: `eGain-Search-Field-Reset-button-${index}`,
          class: "eGain-Search-Field-Reset-button",
          style: `display: ${searchString.length ? 'block' : 'none'}`,
          html: `<i class="fa fa-times"></i>`
        }).on("click", () => {
          collapseAllAccordions();
          articleStack = [];
          eGainUI("#eg-scrollable").removeClass("scroll-disable");
          eGainUI(".eGain-Search-Field-Reset-button").hide();
          eGainUI("[data-egain-role~='popular-articles']").show();
          eGainUI(".eGain-Search-Result-Field-Results-Ul").remove();
          eGainUI(".eGain-Search-Result-Field-Header").remove();
          eGainUI(".eGain-Search-Sugesstion-Result-Field-Header").remove();
          eGainUI(
            ".eGain-Search-Result-Sugession-Field-Results-Ul"
          ).remove();
          eGainUI(item).SearchFieldWidget("", callback, false, true);
          eGainUI("#eg-footer").show();
        });
        eGainUI(item).append(searchResetButton);

        const searchWidgetButton = eGainUI("<button>", {
          id: `eGain-Search-Field-Input-button-${index}`,
          class: "eGain-Search-Field-Input-button",
        })
          .on("click keypress", () => {
            collapseAllAccordions();
            eGainUI(item).SearchFieldWidget(
              eGainUI(searchWidgetInput).val(),
              callback
            );
          })
          .html("<i class='fa fa-search search-icon'></i>");
        eGainUI(item).append(searchWidgetButton);

        const searchWidgetParent = eGainUI("<ul>", {
          id: `eGain-Search-Field-Results-Parent-${index}`,
          class: "eGain-Search-Field-Results-Parent",
          "data-egain-portal-id": params.egainPortalId,
        });
        if (data && data.article && data.article.length >= 1) {
          generateAccordion(searchWidgetParent, index, data, "search-results");
        } else {
          let noResultsMessage = `No results for '${searchTerm}'. Try asking in the form of a question.`;
          searchWidgetNoResults = eGainUI("<div>", {
            id: "eGain-Search-Field-Results-Li-No-Results",
            class: "eGain-Search-Field-Results-Li-No-Results",
            html: noResultsMessage,
          });
          if (!isFirstLoadedWidget) {
            eGainUI(searchWidgetParent).append(searchWidgetNoResults);
          }
        }
        eGainUI(item).append(searchWidgetParent);
      };
      const req = async function () {
        if (tokenStorage.getAccessToken()) {
          await performSearch(item, searchTerm, successCallback, callback);
        }
      };
      if (callAutoCompleteAPI) {
        autocompleteReq(item, index, searchTerm);
      } else if (isFirstLoadedWidget) {
        document
          .getElementById("eg-widget-modal")
          .classList.remove("loading-search");
        successCallback();
      } else {
        req();
      }
    });
  };
  eGainUI.fn.PopularArticles = function (options, callback) {
    // Plugin Code
    this.each(function (index, item) {
      eGainUI(this).html("");
      var isAlternateIdEnabled = false;
      var req = async function () {
        // Start by placing a call to the eGain Web Service to get Popular Articles
        if (tokenStorage.getAccessToken()) {
          await getPopularArticles(item, isAlternateIdEnabled, callback, index);
        }
      };
      req();
    });
  };
})(eGainUI);

// Function to initialize search field widgets
function initializeSearchFieldWidgets() {
  // Select all search field widgets
  const searchFieldWidgets = eGainUI("[data-egain-role~='search-field-widget']");
  // Loop through each search field widget
  searchFieldWidgets.each((_, eachSearchFieldWidget) => {
    // Get search field name
    const searchFieldName = eGainUI.getItemSearchParam(eachSearchFieldWidget);
    // Initialize search field widget
    initializeSearchFieldWidget(eachSearchFieldWidget.id, searchFieldName);
  });
}

// Function to initialize a search field widget
function initializeSearchFieldWidget(widgetId, searchFieldName) {
  // Initialize the search field widget
  eGainUI(`#${widgetId}`).SearchFieldWidget(
    searchFieldName,
    () => {
      // Trigger callback when search field widget is initialized
      eGainUI(`#${widgetId}`).trigger(eGainUI.callBackName, arguments);
    },
    false,
    true
  );
}

// Function to initialize popular widgets
function initializePopularWidgets() {
  // Select all popular widgets
  const popularWidgets = eGainUI("[data-egain-role~='popular-articles']");
  // Loop through each popular widget
  popularWidgets.each((_, eachPopularWidget) => {
    // Initialize popular widget
    initializePopularWidget(eachPopularWidget.id);
  });
}
// Function to initialize a popular widget
function initializePopularWidget(widgetId) {
  // Initialize the popular widget
  eGainUI(`#${widgetId}`).PopularArticles(null, () => {
    // Trigger callback when popular widget is initialized
    eGainUI(`#${widgetId}`).trigger(eGainUI.callBackName, arguments);
  });
}

// Execute when the document is ready
eGainUI(document).ready(async () => {
  // Hide main wrapper and show preloader
  eGainUI("#main-wrapper").hide();
  eGainUI("#preloader").css("display", "block");
  await getConfig();
  await loginUser();
  initializeSearchFieldWidgets();
  initializePopularWidgets();
});

(function (eGainUI) {
  var methods = {
    init(options) {
      const o = eGainUI.extend(
        {
          items: 1,
          itemsOnPage: 1,
          pages: 0,
          displayedPages: 5,
          edges: 2,
          currentPage: 0,
          hrefTextPrefix: "#page-",
          hrefTextSuffix: "",
          prevText: "Prev",
          nextText: "Next",
          ellipseText: "&hellip;",
          cssStyle: "light-theme",
          labelMap: [],
          selectOnClick: true,
          nextAtFront: false,
          invertPageOrder: false,
          useStartEdge: true,
          useEndEdge: true,
          onPageClick(pageNumber, event) {
            // Callback triggered when a page is clicked
            // Page number is given as an optional parameter
          },
          onInit() {
            // Callback triggered immediately after initialization
          },
        },
        options || {}
      );

      const self = this;

      o.pages = o.pages
        ? o.pages
        : Math.ceil(o.items / o.itemsOnPage)
          ? Math.ceil(o.items / o.itemsOnPage)
          : 1;
      if (o.currentPage) {
        o.currentPage -= 1;
      } else {
        o.currentPage = !o.invertPageOrder ? 0 : o.pages - 1;
      }
      o.halfDisplayed = o.displayedPages / 2;

      this.each(() => {
        self
          .addClass(`${o.cssStyle} egain-pagination`)
          .data("eGainPagination", o);
        methods._draw.call(self);
      });

      o.onInit();

      return this;
    },
    selectPage(page) {
      methods._selectPage.call(this, page - 1);
      return this;
    },
    prevPage() {
      const o = this.data("eGainPagination");
      if (!o.invertPageOrder) {
        if (o.currentPage > 0) {
          methods._selectPage.call(this, o.currentPage - 1);
        }
      } else if (o.currentPage < o.pages - 1) {
        methods._selectPage.call(this, o.currentPage + 1);
      }
      return this;
    },
    nextPage() {
      const o = this.data("eGainPagination");
      if (!o.invertPageOrder) {
        if (o.currentPage < o.pages - 1) {
          methods._selectPage.call(this, o.currentPage + 1);
        }
      } else if (o.currentPage > 0) {
        methods._selectPage.call(this, o.currentPage - 1);
      }
      return this;
    },
    getPagesCount() {
      return this.data("eGainPagination").pages;
    },
    getCurrentPage() {
      return this.data("eGainPagination").currentPage + 1;
    },
    destroy() {
      this.empty();
      return this;
    },
    drawPage(page) {
      const o = this.data("eGainPagination");
      o.currentPage = page - 1;
      this.data("eGainPagination", o);
      methods._draw.call(this);
      return this;
    },
    redraw() {
      methods._draw.call(this);
      return this;
    },
    disable() {
      const o = this.data("eGainPagination");
      o.disabled = true;
      this.data("eGainPagination", o);
      methods._draw.call(this);
      return this;
    },
    enable() {
      const o = this.data("eGainPagination");
      o.disabled = false;
      this.data("eGainPagination", o);
      methods._draw.call(this);
      return this;
    },
    updateItems(newItems) {
      const o = this.data("eGainPagination");
      o.items = newItems;
      o.pages = methods._getPages(o);
      this.data("eGainPagination", o);
      methods._draw.call(this);
    },
    updateItemsOnPage(itemsOnPage) {
      const o = this.data("eGainPagination");
      o.itemsOnPage = itemsOnPage;
      o.pages = methods._getPages(o);
      this.data("eGainPagination", o);
      methods._selectPage.call(this, 0);
      return this;
    },
    _draw() {
      const o = this.data("eGainPagination");
      const interval = methods._getInterval(o);
      let i;
      let tagName;

      methods.destroy.call(this);

      tagName =
        typeof this.prop === "function"
          ? this.prop("tagName")
          : this.attr("tagName");

      const $panel =
        tagName === "UL" ? this : eGainUI("<ul></ul>").appendTo(this);

      // Generate Prev link
      if (o.prevText) {
        methods._appendItem.call(
          this,
          !o.invertPageOrder ? o.currentPage - 1 : o.currentPage + 1,
          { text: o.prevText, classes: "prev" }
        );
      }

      // Generate Next link (if option set for at front)
      if (o.nextText && o.nextAtFront) {
        methods._appendItem.call(
          this,
          !o.invertPageOrder ? o.currentPage + 1 : o.currentPage - 1,
          { text: o.nextText, classes: "next" }
        );
      }

      // Generate start edges
      if (!o.invertPageOrder) {
        if (interval.start > 0 && o.edges > 0) {
          if (o.useStartEdge) {
            var end = Math.min(o.edges, interval.start);
            for (i = 0; i < end; i++) {
              methods._appendItem.call(this, i);
            }
          }
          if (o.edges < interval.start && interval.start - o.edges !== 1) {
            $panel.append(
              `<li class="disabled"><span class="ellipse">${o.ellipseText}</span></li>`
            );
          } else if (interval.start - o.edges === 1) {
            methods._appendItem.call(this, o.edges);
          }
        }
      } else if (interval.end < o.pages && o.edges > 0) {
        if (o.useStartEdge) {
          var begin = Math.max(o.pages - o.edges, interval.end);
          for (i = o.pages - 1; i >= begin; i--) {
            methods._appendItem.call(this, i);
          }
        }

        if (
          o.pages - o.edges > interval.end &&
          o.pages - o.edges - interval.end !== 1
        ) {
          $panel.append(
            `<li class="disabled"><span class="ellipse">${o.ellipseText}</span></li>`
          );
        } else if (o.pages - o.edges - interval.end === 1) {
          methods._appendItem.call(this, interval.end);
        }
      }

      // Generate interval links
      if (!o.invertPageOrder) {
        for (i = interval.start; i < interval.end; i++) {
          methods._appendItem.call(this, i);
        }
      } else {
        for (i = interval.end - 1; i >= interval.start; i--) {
          methods._appendItem.call(this, i);
        }
      }

      // Generate end edges
      if (!o.invertPageOrder) {
        if (interval.end < o.pages && o.edges > 0) {
          if (
            o.pages - o.edges > interval.end &&
            o.pages - o.edges - interval.end !== 1
          ) {
            $panel.append(
              `<li class="disabled"><span class="ellipse">${o.ellipseText}</span></li>`
            );
          } else if (o.pages - o.edges - interval.end === 1) {
            methods._appendItem.call(this, interval.end);
          }
          if (o.useEndEdge) {
            var begin = Math.max(o.pages - o.edges, interval.end);
            for (i = begin; i < o.pages; i++) {
              methods._appendItem.call(this, i);
            }
          }
        }
      } else if (interval.start > 0 && o.edges > 0) {
        if (o.edges < interval.start && interval.start - o.edges !== 1) {
          $panel.append(
            `<li class="disabled"><span class="ellipse">${o.ellipseText}</span></li>`
          );
        } else if (interval.start - o.edges === 1) {
          methods._appendItem.call(this, o.edges);
        }

        if (o.useEndEdge) {
          var end = Math.min(o.edges, interval.start);
          for (i = end - 1; i >= 0; i--) {
            methods._appendItem.call(this, i);
          }
        }
      }

      // Generate Next link (unless option is set for at front)
      if (o.nextText && !o.nextAtFront) {
        methods._appendItem.call(
          this,
          !o.invertPageOrder ? o.currentPage + 1 : o.currentPage - 1,
          { text: o.nextText, classes: "next" }
        );
      }
    },
    _getPages(o) {
      const pages = Math.ceil(o.items / o.itemsOnPage);
      return pages || 1;
    },
    _getInterval(o) {
      return {
        start: Math.ceil(
          o.currentPage > o.halfDisplayed
            ? Math.max(
              Math.min(
                o.currentPage - o.halfDisplayed,
                o.pages - o.displayedPages
              ),
              0
            )
            : 0
        ),
        end: Math.ceil(
          o.currentPage > o.halfDisplayed
            ? Math.min(o.currentPage + o.halfDisplayed, o.pages)
            : Math.min(o.displayedPages, o.pages)
        ),
      };
    },
    _appendItem(pageIndex, opts) {
      const self = this;
      let options;
      let $link;
      const o = self.data("eGainPagination");
      const $linkWrapper = eGainUI("<li></li>");
      const $ul = self.find("ul");

      pageIndex =
        pageIndex < 0 ? 0 : pageIndex < o.pages ? pageIndex : o.pages - 1;

      options = {
        text: pageIndex + 1,
        classes: "",
      };

      if (o.labelMap.length && o.labelMap[pageIndex]) {
        options.text = o.labelMap[pageIndex];
      }

      options = eGainUI.extend(options, opts || {});

      if (pageIndex === o.currentPage || o.disabled) {
        if (o.disabled) {
          $linkWrapper.addClass("disabled");
        } else {
          $linkWrapper.addClass("active");
        }
        $link = $(`<span class="current">${options.text}</span>`);
      } else {
        $link = $(
          `<a href="${o.hrefTextPrefix}${pageIndex + 1}${o.hrefTextSuffix
          }" class="page-link">${options.text}</a>`
        );
        $link.click((event) =>
          methods._selectPage.call(self, pageIndex, event)
        );
      }

      if (options.classes) {
        $link.addClass(options.classes);
      }

      $linkWrapper.append($link);

      if ($ul.length) {
        $ul.append($linkWrapper);
      } else {
        self.append($linkWrapper);
      }
    },
    _selectPage(pageIndex, event) {
      const o = this.data("pagination");
      o.currentPage = pageIndex;
      if (o.selectOnClick) {
        methods._draw.call(this);
      }
      return o.onPageClick(pageIndex + 1, event);
    },
  };

  eGainUI.fn.eGainPagination = function (method) {
    // Method calling logic
    if (methods[method] && method.charAt(0) !== "_") {
      return methods[method].apply(
        this,
        Array.prototype.slice.call(arguments, 1)
      );
    }
    if (typeof method === "object" || !method) {
      return methods.init.apply(this, arguments);
    }
    eGainUI.error(`Method ${method} does not exist on eGainUI.eGainPagination`);
    return null;
  };
})(eGainUI);

const loginUser = async () => {
  const userType = params.egainUserType;
  if (userType === "agent") {
    const response = await B2cLogin();
    console.log('response', response);
    if(!response.data) {
      console.log('login for the first time, b2c login failed');
      return;
    }
    else if(response.data.Authorization) {
    const authToken = response.data.Authorization;
    if(authToken) {
     console.log('login for the first time, b2c login done');
      tokenStorage.setTokens(authToken, "");
      eGainUI("#main-wrapper").show();
      eGainUI("#preloader").css("display", "none");
      await getConfigArticle();
    }
    else{
      console.log('login for the first time, b2c login failed');
    }
  }
  } else {
    if (!tokenStorage.getAccessToken()) {
      console.log("Fetching customer session");
      await getAnonymousCustomerSession();
    }
  }
};

const performSearch = async (item, searchTerm, successCallback, callback) => {
  try {
    eGainUI.ajaxRequest({
      url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/search`,
      data: {
        q: searchTerm,
        $attribute: "id,name",
        $lang: params.egainLocale,
        $domain: params.egainDomainHint,
      },
      error(data) {
        console.log("error in search field widget", data);
      },
      complete(data) {
        retryCount = 0;
        if (data.status === 200) {
          successCallback(data.responseJSON);
        }
        callback();
      },
    });
  } catch (error) {
    console.log("error in performSearch ", error);
  }
};

// const generateShareButtonForSuggestion = async (
//   target,
//   item,
//   dataitem,
//   dataindex
// ) => {
//   var articleLink = eGainUI.getItemTemplateArticlePageUrl(
//     item,
//     dataitem,
//     {},
//     "suggestion"
//   );

//   var shareDropdown = eGainUI("<div>", {
//     class: "eGain-article-share-dropdown eg-dropdown dropdown",
//   });

//   var shareButton = eGainUI("<button>", {
//     id: "eGain-article-share-dropdown-button" + dataindex,
//     class: "eGain-article-share-button eg-dropdown-toggle dropdown-toggle",
//     type: "button",
//     "data-bs-toggle": "dropdown",
//     "aria-expanded": "false",
//   });

//   var shareIcon = eGainUI("<i>", {
//     class: "eGain-article-share-icon fa fa-share-alt",
//   });
//   eGainUI(shareButton).append(shareIcon);

//   eGainUI(shareDropdown).append(shareButton);

//   var shareDropdownMenu = eGainUI("<div>", {
//     class: "eGain-article-share-dropdown-menu eg-dropdown-menu dropdown-menu",
//     "aria-labelledby": "eGain-article-share-dropdown-button" + dataindex,
//   });

//   var shareArticleLink = eGainUI("<button>", {
//     id: "eGain-article-share-link" + dataindex,
//     class: "eGain-article-share-link eg-dropdown-item dropdown-item",
//     title: "Copy Link",
//   });
//   shareArticleLink.on("click", function () {
//     if (!navigator.clipboard) {
//       var copyText = document.createElement("input");
//       copyText.style = "display:none";
//       copyText.value = articleLink;
//       document.body.appendChild(copyText);
//       copyText.select();
//       copyText.setSelectionRange(0, 99999); /*For mobile devices*/
//       document.execCommand("copy");
//       //DK: should we use this as th eabove is deperecated - (this is not eyt fully developed in all browsers) navigator.clipboard();
//     } else navigator.clipboard.writeText(articleLink);
//   });

//   var shareArticleLinkImage = eGainUI("<i>", {
//     class: "copy-icon",
//   });
//   eGainUI(shareArticleLink).append(shareArticleLinkImage);

//   eGainUI(shareDropdownMenu).append(shareArticleLink);

//   var shareArticleEmail = eGainUI("<a>", {
//     class: "eGain-article-share-email eg-dropdown-item dropdown-item",
//     title: "Email Link",
//     href: `mailto:?subject=${dataitem.name}&body=${articleLink}`,
//   });

//   var shareArticleEmailImage = eGainUI("<i>", {
//     class: "email-icon",
//   });
//   eGainUI(shareArticleEmail).append(shareArticleEmailImage);
//   eGainUI(shareDropdownMenu).append(shareArticleEmail);
//   eGainUI(shareDropdown).append(shareDropdownMenu);
//   eGainUI(target).append(shareDropdown);
// };

function collapseAllAccordions() {
  closeAllDropdowns();
  isAccordionOpen = false;
  eGainUI("#eg-scrollable").removeClass("scroll-disable");
  let closeAccordions = {};
  let openAccordions = Array.from(
    document.getElementsByClassName("collapse show")
  );
  openAccordions.forEach((accordion, index) => {
    closeAccordions[`bsCollapse${index}`] = new bootstrap.Collapse(accordion, {
      toggle: true,
    });
  });
}

function checkAccordionsOpen(dataitem) {
  isAccordionOpen = !isAccordionOpen;
  if (isAccordionOpen) {
    console.log('onclick');
    eGainUI("#eg-scrollable").addClass("scroll-disable");
    articleStack.push({
      article: dataitem,
      type: 'data'
    });
    return true;
  } else {
    eGainUI("#eg-scrollable").removeClass("scroll-disable");
    articleStack = [];
    console.log('not onclick');
    return false;
  }
}

function closeAllDropdowns() {
  console.log('close all dropdowns');
  let openDropdowns = Array.from(
    document.getElementsByClassName("eg-dropdown-toggle show")
  );
  openDropdowns.forEach((dropdown) => {
    dropdown.click();
  });
}

const generateShareButton = async (target, item, dataitem, dataindex) => {
  console.log('attributes',target, item, dataitem, dataindex )
  var articleLink = eGainUI.getItemTemplateArticlePageUrl(item, dataitem, {});

  var shareDropdown = eGainUI("<div>", {
    class: "eGain-article-share-dropdown-position eg-dropdown dropdown",
  });

  var shareButton = eGainUI("<button>", {
    id: "eGain-article-rating-share-button" + dataindex,
    class: "eGain-article-rating-sharebutton",
    html: `<i class="fa fa-share-alt"></i>&nbsp;&nbsp;Share`,
    type: "button",
    "data-bs-toggle": "dropdown",
    "aria-expanded": "false",
    style: {
      "background-color": "white",
      "border": "none",
      "font-size": "10",
    }
  });
  
  // var shareIcon = eGainUI("<i>", {
  //   class: "eGain-article-share-icon fa fa-share-alt",
  // });
  // eGainUI(shareButton).append(shareIcon);

  eGainUI(shareDropdown).append(shareButton);

  var shareDropdownMenu = eGainUI("<div>", {
    class: "eGain-article-share-dropdown-menu eg-dropdown-menu dropdown-menu",
    "aria-labelledby": "eGain-article-rating-share-button" + dataindex,
  });

  var shareArticleLink = eGainUI("<button>", {
    id: "eGain-article-share-link" + dataindex,
    class: "eGain-article-share-link eg-dropdown-item dropdown-item",
    title: "Copy Link",
  });
  shareArticleLink.on("click", function () {
    if (!navigator.clipboard) {
      var copyText = document.createElement("input");
      copyText.style = "display:none";
      copyText.value = articleLink;
      document.body.appendChild(copyText);
      copyText.select();
      copyText.setSelectionRange(0, 99999); /*For mobile devices*/
      document.execCommand("copy");
    } else navigator.clipboard.writeText(articleLink);
  });

  var shareArticleLinkImage = eGainUI("<i>", {
    class: "copy-icon",
  });
  eGainUI(shareArticleLink).append(shareArticleLinkImage);

  eGainUI(shareDropdownMenu).append(shareArticleLink);

  var shareArticleEmail = eGainUI("<a>", {
    class: "eGain-article-share-email eg-dropdown-item dropdown-item",
    title: "Email Link",
    href: `mailto:?subject=${dataitem.name}&body=${articleLink}`,
  });

  var shareArticleEmailImage = eGainUI("<i>", {
    class: "email-icon",
  });
  eGainUI(shareArticleEmail).append(shareArticleEmailImage);

  eGainUI(shareDropdownMenu).append(shareArticleEmail);

  eGainUI(shareDropdown).append(shareDropdownMenu);
console.log('target in generate share button',target);
  eGainUI(target).append(shareDropdown);
};

const generateArticleFooter = async (target, item, dataitem, dataindex) => {
  function rateArticle(id, score, type, dataindex) {
    let buttons = {
      positive: document.getElementById(
        "eGain-article-rating-positive-button" + dataindex
      ),
      negative: document.getElementById(
        "eGain-article-rating-negative-button" + dataindex
      ),
    };
    buttons.positive.disabled = true;
    buttons.negative.disabled = true;
    buttons[type].classList.add("selected");
    eGainUI.ajaxRequest({
      url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${id}/ratings?score=${score}`,
      type: "PUT",
      success: function (response) {
        //no print
        console.log('generate article footer response', response);
      },
    });
  }

  var footerTools = eGainUI("<div>", {
    class: "eGain-article-footer-tools",
  });

  var footerToolsUpper = eGainUI("<div>", {
    class: "eGain-article-footer-tools-upper",
  });

  var articleRating = eGainUI("<div>", {
    class: "eGain-article-rating",
  });

  var ratingLabel = eGainUI("<div>", {
    class: "eGain-article-rating-label",
    html: "Was this helpful?",
  });
  eGainUI(articleRating).append(ratingLabel);

  var ratingPositiveButton = eGainUI("<button>", {
    id: "eGain-article-rating-positive-button" + dataindex,
    class: "eGain-article-rating-positive-button",
    html: `<i class="fa fa-thumbs-up"></i>&nbsp;&nbsp;Like`,
  });

  eGainUI(articleRating).append(ratingPositiveButton);

  ratingPositiveButton.on("click", function () {
    rateArticle(dataitem.id, 1, "positive", dataindex);
  });

  var ratingNegativeButton = eGainUI("<button>", {
    id: "eGain-article-rating-negative-button" + dataindex,
    class: "eGain-article-rating-negative-button",
    html: `<i class="fa fa-thumbs-down"></i>&nbsp;&nbsp;Dislike`,
  });
  eGainUI(articleRating).append(ratingNegativeButton);
  ratingNegativeButton.on("click", function () {
    rateArticle(dataitem.id, 0, "negative", dataindex);
  });

  var ratingSharingButton = eGainUI("<button>", {
    id: "eGain-article-rating-share-button" + dataindex,
    class: "eGain-article-rating-sharebutton",
    html: `<i class="fa fa-share-alt"></i>&nbsp;&nbsp;Share`,
    type: "button",
    "data-bs-toggle": "dropdown",
    "aria-expanded": "false",
  });
  // ratingShareButton.on("click", function () {
  //   generateShareButton(target, item, dataitem, dataindex);
  // });
  eGainUI(articleRating).append(ratingSharingButton);
  eGainUI(footerToolsUpper).append(articleRating);

  eGainUI(footerTools).append(footerToolsUpper);

  var footerToolsLower = eGainUI("<div>", {
    class: "eGain-article-footer-tools-lower",
  });

  var surveyLinkContainer = eGainUI("<div>", {
    class: "eGain-article-survey-link-container",
  });

  var contactSurvey = eGainUI("<a>", { 
    class: "eGain-article-survey-link",
    href: surveyLink,
    target: "_blank",
    html: `<i class="fa fa-comment-dots"></i><span class="feedback" style="padding-left: 9px;">Feedback</span>`,
  });

  eGainUI(surveyLinkContainer).append(contactSurvey);

  eGainUI(footerToolsUpper).append(surveyLinkContainer);

  eGainUI(footerTools).append(footerToolsLower);

  eGainUI(target).append(footerTools);
  // generateShareButton(articleRating, item, dataitem, dataindex);
};

const generateArticleSuggestionFooter = async (
  target,
  item,
  dataitem,
  dataindex,
  article
) => {
  function rateArticle(id, score, type, dataindex) {
    let buttons = {
      positive: document.getElementById(
        "eGain-article-rating-positive-button" + dataindex
      ),
      negative: document.getElementById(
        "eGain-article-rating-negative-button" + dataindex
      ),
    };
    buttons.positive.disabled = true;
    buttons.negative.disabled = true;
    buttons[type].classList.add("selected");
    eGainUI.ajaxRequest({
      url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${id}/ratings?score=${score}`,
      type: "PUT",
      success: function (response) {
        //it is not printing the response
        console.log('rate article response', response);
      },
    });
  }

  var footerTools = eGainUI("<div>", {
    class: "eGain-article-footer-tools",
  });

  var footerToolsUpper = eGainUI("<div>", {
    class: "eGain-article-footer-tools-upper",
  });

  var articleRating = eGainUI("<div>", {
    class: "eGain-article-rating",
  });

  var ratingLabel = eGainUI("<div>", {
    class: "eGain-article-rating-label",
    html: "Was this helpful?",
  });
  eGainUI(articleRating).append(ratingLabel);

  var ratingPositiveButton = eGainUI("<button>", {
    id: "eGain-article-rating-positive-button" + dataindex,
    class: "eGain-article-rating-positive-button",
    html: `<i class="fa fa-thumbs-up"></i>&nbsp;&nbsp;Like`,
  });
  eGainUI(articleRating).append(ratingPositiveButton);
  ratingPositiveButton.on("click", function () {
    rateArticle(dataitem.entityId, 1, "positive", dataindex);
  });

  var ratingNegativeButton = eGainUI("<button>", {
    id: "eGain-article-rating-negative-button" + dataindex,
    class: "eGain-article-rating-negative-button",
    html: `<i class="fa fa-thumbs-down"></i>&nbsp;&nbsp;Dislike`,
  });
  eGainUI(articleRating).append(ratingNegativeButton);
  ratingNegativeButton.on("click", function () {
    rateArticle(dataitem.entityId, 0, "negative", dataindex);
  });
  // var ratingSharingButton = eGainUI("<button>", {
  //   id: "eGain-article-rating-share-button" + dataindex,
  //   class: "eGain-article-rating-sharebutton",
  //   html: `<i class="fa fa-share-alt"></i>&nbsp;&nbsp;Share`,
  // });
  // eGainUI(articleRating).append(ratingSharingButton);
  //generateShareButton(target, item, dataitem, dataindex);
  eGainUI(footerToolsUpper).append(articleRating);

  eGainUI(footerTools).append(footerToolsUpper);

  var footerToolsLower = eGainUI("<div>", {
    class: "eGain-article-footer-tools-lower",
  });

  var surveyLinkContainer = eGainUI("<div>", {
    class: "eGain-article-survey-link-container",
  });

  var contactSurvey = eGainUI("<a>", {
    class: "eGain-article-survey-link",
    href: surveyLink,
    target: "_blank",
    html: `<i class="fa fa-comment-dots"></i><span class="feedback" style="padding-left: 9px;">Feedback</span>`,
  });

  eGainUI(surveyLinkContainer).append(contactSurvey);
//final
  eGainUI(footerToolsUpper).append(surveyLinkContainer);

  eGainUI(footerTools).append(footerToolsLower);

  eGainUI(target).append(footerTools);
};

function successCallback(response, requestData) {
  let article = response.article[0];
  var accordionBody = eGainUI("<div>", {
    class: "eGain-" + requestData.type + "-Body eg-accordion-body",
    html: article.content,
  });

  accordionBody.find("a").each(function () {
    // Get the href attribute of each <a> element
    var href = eGainUI(this).attr("href");
    var linkClass = eGainUI(this).attr("class");
    // Check if the href is an absolute URL
    if (
      linkClass !== null &&
      (linkClass === "eGainArticleLink" || linkClass === "egainarticle")
    ) {
      eGainUI(this).attr("articleid");
      eGainUI(this).on("click", function (event) {
        // Prevent the default link behavior (e.g., navigating to a new page)
        event.preventDefault();

        // Get the clicked link element
        const $clickedLink = eGainUI(this);

        // Retrieve all attributes of the clicked link
        const attributes = $clickedLink[0].attributes;

        // Create an object to store the attributes and their values
        const attributeValues = {};

        // Loop through the attributes and store them in the object
        eGainUI.each(attributes, function () {
          attributeValues[this.name] = this.value;
        });

        // Display the attributes and their values
        loadArticleLink(attributeValues);
      });
    } else if (isAbsoluteURL(href)) {
      // Add target="_blank" to open in a new tab/window
      eGainUI(this).attr("target", "_blank");
    }
  });

  eGainUI(requestData.accordionContent).append(accordionBody);
  generateArticleFooter(
    requestData.accordionContent,
    requestData.item,
    requestData.dataitem,
    requestData.dataindex
  );
}

function makeAjaxRequest(url, requestData, retryCount = 2) {
  eGainUI.ajaxRequest({
    url: url,
    data: {
      $attribute: "name,content",
      $lang: params.egainLocale,
    },
    success: async function (response) {
      successCallback(response, requestData);
    },
    error: async function (xhr, status, error) {
      if (xhr.status === 401 && retryCount > 0) {
        // Retry the request with decreased retryCount
        await loginUser();
        makeAjaxRequest(url, requestData, retryCount - 1);
      } else {
        // Handle other error cases here
        console.error("Request failed with status code:",xhr.status,"Error:",xhr.responseText);
      }
    },
  });
}

const generateAccordion = async (item, index, data, type) => {
  var accordion = eGainUI("<div>", {
    id: "eGain-" + type + "-Accordion-" + index,
    class: "eGain-" + type + "-Accordion eg-accordion",
  });
  eGainUI(item).append(accordion);

  eGainUI(data.article.slice(0, maxListSize)).each(function (
    dataindex,
    dataitem
  ) {
    var accordionItem = eGainUI("<div>", {
      id: "eGain-" + type + "-Item-" + dataindex,
      class: "eGain-" + type + "-Item eg-accordion-item",
    });
    eGainUI(accordion).append(accordionItem);

    var accordionHeader = eGainUI("<h2>", {
      id: "eGain-" + type + "-Header-" + dataindex,
      class: "eGain-" + type + "-Header eg-accordion-header",
    });
    eGainUI(accordionItem).append(accordionHeader);

    var accordionToggle = eGainUI("<button>", {
      id: "eGain-" + type + "-Toggle-" + dataindex,
      class: "eGain-" + type + "-Toggle eg-accordion-button collapsed",
      type: "button",
      "data-bs-toggle": "collapse",
      "data-bs-target": "#eGain-" + type + "-Content-" + dataindex,
      "aria-expanded": "false",
      "aria-controls": "eGain-" + type + "-Content-" + dataindex,
    });

let accordiansOPen = false;
    accordionToggle.on("click", function () {
   accordiansOPen = checkAccordionsOpen(dataitem);
   console.log('result of accordiansOPen', accordiansOPen);
    if (accordiansOPen) {
      eGainUI(articleParentDiv).css("display", "flex");
    } else {
      eGainUI(articleParentDiv).css("display", "none");
    }
   
      closeAllDropdowns();
       
    });
    console.log('result of accordiansOPen after onclick function', accordiansOPen);

   var articleParentDiv = eGainUI("<div>", {
    id: "eGain-article-parent-div",
    class: "eGain-article-parent-div",
  });
  // var articleDiv = eGainUI("<div>", {
  //   class: "eGain-article-box",
  //   id: "eGain-article-box",
  //   html: "ARTICLE"
  //  });
  var articleDiv = eGainUI("<div>", {
    class: "eGain-article-box",
    id: "eGain-article-box",
    html: "ARTICLE",
    style: "font-size: 13px; padding-left: 2px; padding-right: 2px; background-color: black; color: #d2caca; text-align: center; margin-right: 4px;"
  });
   eGainUI(articleParentDiv).append(articleDiv);
   var articleNumberDiv = eGainUI("<div>", {
    class: "eGain-article-number",
    id: "eGain-article-number",
    html: dataitem.alternateId
   });
   eGainUI(articleParentDiv).css("display", "none");
   eGainUI(articleParentDiv).append(articleNumberDiv);
   eGainUI(accordionToggle).append(articleParentDiv);
    
    var accordionToggleText = eGainUI("<div>", {
      class: "eGain-accordion-toggle-text",
      html: dataitem.name,
    });
    eGainUI(accordionToggle).append(accordionToggleText);

    eGainUI(accordionHeader).append(accordionToggle);

    var accordionContent = eGainUI("<div>", {
      id: "eGain-" + type + "-Content-" + dataindex,
      class: "eGain-" + type + "-Content eg-accordion-collapse collapse",
      "aria-labelledby": "eGain-" + type + "-Header-" + dataindex,
      "data-bs-parent": "#eGain-" + type + "-Accordion-" + index,
    });
    eGainUI(accordionItem).append(accordionContent);

    //generateShareButton(accordionContent, item, dataitem, dataindex);
    const url = `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${dataitem.id}`;
    const requestData = {
      item,
      type,
      accordionContent,
      dataitem,
      dataindex,
    };
    makeAjaxRequest(url, requestData);
  });
};

let articleStack = [];

const loadArticleLink = async (attributeValues, isBackButton = true) => {
  // eGainUI("#eg-footer").hide();
  eGainUI(".eGain-Search-Field-Reset-button").show();
  collapseAllAccordions();
  eGainUI(".eGain-Search-Suggetion-Results-Ul").remove();
  eGainUI(".eGain-Search-Field-Results-Parent").remove();
  eGainUI("[data-egain-role~='popular-articles']").hide();
  eGainUI(".eGain-article-container").remove();
  let item = eGainUI('#eg-search-field-widget-id');

  articleStack.push({
    article: attributeValues,
    type: 'link'
  });

  var articleContainer = eGainUI("<div>", {
    id: "eGain-article-container",
    class: "eGain-article-container",
  });

  var accordionHeaderDiv = eGainUI("<div>", {
    id: "eGain-article-Header-Container",
    class: "eGain-article-header-container",
  });

  if (isBackButton) {
    var backButton = eGainUI("<button>", {
      type: 'button',
      id: 'eGain-article-back-button',
      html: `<i class="fa fa-angle-left"></i>`
    });
    backButton.on('click', () => {
      eGainUI(backButton).prop('disabled', true);
      articleStack.pop();
      let article = articleStack.pop();
      if (article.type === 'suggestion') loadArticlePageById(article.article, item, !!articleStack.length);
      if (article.type === 'data') loadArticleData(article.article, !!articleStack.length);
      if (article.type === 'link') loadArticleLink(article.article, !!articleStack.length);
    });
    eGainUI(accordionHeaderDiv).append(backButton);
  }
  var articleParentDiv = eGainUI("<div>", {
    id: "eGain-article-parent-div",
    class: "eGain-article-parent-div",
  });
  var articleDiv = eGainUI("<div>", {
    class: "eGain-article-box",
    id: "eGain-article-box",
    html: "ARTICLE"
   });
   eGainUI(articleParentDiv).append(articleDiv);
   var articleNumberDiv = eGainUI("<div>", {
    class: "eGain-article-number",
    id: "eGain-article-number",
    html: attributeValues.alternateId
   });
   articleNumberDiv.style.fontSize = '13px';
   eGainUI(articleParentDiv).append(articleNumberDiv);
    eGainUI(accordionHeaderDiv).append(articleParentDiv);
  var accordionArticleHeader = eGainUI("<h2>", {
    id: "eGain-article-Header",
    class: "eGain-article-Header eg-accordion-header",
    html: attributeValues.articlename,
  });
  eGainUI(accordionHeaderDiv).append(accordionArticleHeader);

  eGainUI.ajaxRequest({
    url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${attributeValues.articleid}`,
    data: {
      $attribute: "all",
      $lang: params.egainLocale,
    },
    success: function (response) {
      let article = response.article[0];

     // generateShareButton(accordionHeaderDiv, item, article, 0);

      var accordionArticleBodyContainer = eGainUI("<div>", {
        class: "eGain-article-Body eg-accordion-body",
      });

      var accordionArticleBody = eGainUI("<div>", {
        class: "eGain-article-content",
        id: "eGain-article-content",
        html: article.content,
      });
      accordionArticleBodyContainer.append(accordionArticleBody);

      accordionArticleBody.find("a").each(function () {
        // Get the href attribute of each <a> element
        var href = eGainUI(this).attr("href");
        var linkClass = eGainUI(this).attr("class");
        // Check if the href is an absolute URL
        if (
          linkClass !== null &&
          (linkClass === "eGainArticleLink" || linkClass === "egainarticle")
        ) {
          eGainUI(this).attr("articleid");
          eGainUI(this).on("click", function (event) {
            // Prevent the default link behavior (e.g., navigating to a new page)
            event.preventDefault();

            // Get the clicked link element
            const $clickedLink = eGainUI(this);

            // Retrieve all attributes of the clicked link
            const attributes = $clickedLink[0].attributes;

            // Create an object to store the attributes and their values
            const attributeValues = {};

            // Loop through the attributes and store them in the object
            eGainUI.each(attributes, function () {
              attributeValues[this.name] = this.value;
            });

            // Display the attributes and their values
            loadArticleLink(attributeValues);
          });
        } else if (isAbsoluteURL(href)) {
          // Add target="_blank" to open in a new tab/window
          eGainUI(this).attr("target", "_blank");
        }
      });

      eGainUI(articleContainer).append(accordionHeaderDiv);
      generateArticleFooter(
        accordionArticleBodyContainer,
        item,
        article,
        0,
        article
      );
      eGainUI(articleContainer).append(accordionArticleBodyContainer);
      eGainUI(item).append(articleContainer);
    },
  });
};

const loadArticleData = async (dataitem, isBackButton = true) => {
  // eGainUI("#eg-footer").hide();
  console.log('dataitems',dataitem);
  eGainUI(".eGain-Search-Field-Reset-button").show();
  collapseAllAccordions();
  eGainUI(".eGain-Search-Suggetion-Results-Ul").remove();
  eGainUI(".eGain-Search-Field-Results-Parent").remove();
  eGainUI("[data-egain-role~='popular-articles']").hide();
  eGainUI(".eGain-article-container").remove();
  let item = eGainUI('#eg-search-field-widget-id');

  articleStack.push({
    article: dataitem,
    type: 'data'
  });

  var articleContainer = eGainUI("<div>", {
    id: "eGain-article-container",
    class: "eGain-article-container",
  });

  var accordionHeaderDiv = eGainUI("<div>", {
    id: "eGain-article-Header-Container",
    class: "eGain-article-header-container",
  });

  if (isBackButton) {
    var backButton = eGainUI("<button>", {
      type: 'button',
      id: 'eGain-article-back-button',
      html: `<i class="fa fa-angle-left"></i>`
    });
    backButton.on('click', () => {
      eGainUI(backButton).prop('disabled', true);
      articleStack.pop();
      let article = articleStack.pop();
      if (article.type === 'suggestion') loadArticlePageById(article.article, item, !!articleStack.length);
      if (article.type === 'data') loadArticleData(article.article, !!articleStack.length);
      if (article.type === 'link') loadArticleLink(article.article, !!articleStack.length);
    });
    eGainUI(accordionHeaderDiv).append(backButton);
  }
  var articleParentDiv = eGainUI("<div>", {
    id: "eGain-article-parent-div",
    class: "eGain-article-parent-div",
  });
  var articleDiv = eGainUI("<div>", {
    class: "eGain-article-box",
    id: "eGain-article-box",
    html: "ARTICLE"
   });
   eGainUI(articleParentDiv).append(articleDiv);
   var articleNumberDiv = eGainUI("<div>", {
    class: "eGain-article-number",
    id: "eGain-article-number",
    html: dataitem.alternateId
   });
   eGainUI(articleParentDiv).append(articleNumberDiv);
    eGainUI(accordionHeaderDiv).append(articleParentDiv);
  var accordionArticleHeader = eGainUI("<h2>", {
    id: "eGain-article-Header",
    class: "eGain-article-Header eg-accordion-header",
    html: dataitem.name,
  });
  eGainUI(accordionHeaderDiv).append(accordionArticleHeader);

  eGainUI.ajaxRequest({
    url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${dataitem.id}`,
    data: {
      $attribute: "all",
      $lang: params.egainLocale,
    },
    success: function (response) {
      let article = response.article[0];

      //generateShareButton(accordionHeaderDiv, item, article, 0);

      var accordionArticleBodyContainer = eGainUI("<div>", {
        class: "eGain-article-Body eg-accordion-body",
      });

      var accordionArticleBody = eGainUI("<div>", {
        class: "eGain-article-content",
        id: "eGain-article-content",
        html: article.content,
       
      });
      accordionArticleBodyContainer.append(accordionArticleBody);

      accordionArticleBody.find("a").each(function () {
        // Get the href attribute of each <a> element
        var href = eGainUI(this).attr("href");
        var linkClass = eGainUI(this).attr("class");
        // Check if the href is an absolute URL
        if (
          linkClass !== null &&
          (linkClass === "eGainArticleLink" || linkClass === "egainarticle")
        ) {
          eGainUI(this).attr("articleid");
          eGainUI(this).on("click", function (event) {
            // Prevent the default link behavior (e.g., navigating to a new page)
            event.preventDefault();

            // Get the clicked link element
            const $clickedLink = eGainUI(this);

            // Retrieve all attributes of the clicked link
            const attributes = $clickedLink[0].attributes;

            // Create an object to store the attributes and their values
            const attributeValues = {};

            // Loop through the attributes and store them in the object
            eGainUI.each(attributes, function () {
              attributeValues[this.name] = this.value;
            });

            // Display the attributes and their values
            loadArticleLink(attributeValues);
          });
        } else if (isAbsoluteURL(href)) {
          // Add target="_blank" to open in a new tab/window
          eGainUI(this).attr("target", "_blank");
        }
      });

      eGainUI(articleContainer).append(accordionHeaderDiv);
      generateArticleFooter(
        accordionArticleBodyContainer,
        item,
        article,
        0,
        article
      );
      eGainUI(articleContainer).append(accordionArticleBodyContainer);
      eGainUI(item).append(articleContainer);
    },
  });
};

const loadArticlePageById = async (dataitem, item, isBackButton = false) => {
  // eGainUI("#eg-footer").hide();
  console.log('dataitems1',dataitem);
  eGainUI(".eGain-Search-Field-Reset-button").show();
  collapseAllAccordions();
  eGainUI(".eGain-Search-Suggetion-Results-Ul").remove();
  eGainUI(".eGain-Search-Field-Results-Parent").remove();
  eGainUI("[data-egain-role~='popular-articles']").hide();
  eGainUI(".eGain-article-container").remove();

  articleStack.push({
    article: dataitem,
    type: 'suggestion'
  });

  var articleContainer = eGainUI("<div>", {
    id: "eGain-article-container",
    class: "eGain-article-container",
  });

  var accordionHeaderDiv = eGainUI("<div>", {
    id: "eGain-article-Header-Container",
    class: "eGain-article-header-container",
  });

  if (isBackButton) {
    var backButton = eGainUI("<button>", {
      type: 'button',
      id: 'eGain-article-back-button',
      html: `<i class="fa fa-angle-left"></i>`
    });
    backButton.on('click', () => {
      eGainUI(backButton).prop('disabled', true)
      articleStack.pop();
      let article = articleStack.pop();
      if (article.type === 'suggestion') loadArticlePageById(article.article, item, !!articleStack.length);
      if (article.type === 'data') loadArticleData(article.article, !!articleStack.length);
      if (article.type === 'link') loadArticleLink(article.article, !!articleStack.length);
    });
    eGainUI(accordionHeaderDiv).append(backButton);
  }
  var articleParentDiv = eGainUI("<div>", {
    id: "eGain-article-parent-div",
    class: "eGain-article-parent-div",
  });
  var articleDiv = eGainUI("<div>", {
    class: "eGain-article-box",
    id: "eGain-article-box",
    html: "ARTICLE"
   });
   eGainUI(articleParentDiv).append(articleDiv);
   var articleNumberDiv = eGainUI("<div>", {
    class: "eGain-article-number",
    id: "eGain-article-number",
    html: dataitem.alternateId
   });
   eGainUI(articleParentDiv).append(articleNumberDiv);
    eGainUI(accordionHeaderDiv).append(articleParentDiv);
  var accordionArticleHeader = eGainUI("<h2>", {
    id: "eGain-article-Header",
    class: "eGain-article-Header eg-accordion-header",
    html: dataitem.suggestion,
  });
  eGainUI(accordionHeaderDiv).append(accordionArticleHeader);
  // generateShareButtonForSuggestion(accordionHeaderDiv, item, dataitem, 0);

  eGainUI.ajaxRequest({
    url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/articles/${dataitem.entityId}`,
    data: {
      $attribute: "all",
      $lang: params.egainLocale,
    },
    success: function (response) {
      let article = response.article[0];
      var accordionArticleBodyContainer = eGainUI("<div>", {
        class: "eGain-article-Body eg-accordion-body",
      });

      var accordionArticleBody = eGainUI("<div>", {
        class: "eGain-article-content",       
        id: "eGain-article-content",
        html: article.content,
      });
      accordionArticleBodyContainer.append(accordionArticleBody);

      accordionArticleBody.find("a").each(function () {
        // Get the href attribute of each <a> element
        var href = eGainUI(this).attr("href");
        var linkClass = eGainUI(this).attr("class");
        // Check if the href is an absolute URL
        if (
          linkClass !== null &&
          (linkClass === "eGainArticleLink" || linkClass === "egainarticle")
        ) {
          eGainUI(this).attr("articleid");
          eGainUI(this).on("click", function (event) {
            // Prevent the default link behavior (e.g., navigating to a new page)
            event.preventDefault();

            // Get the clicked link element
            const $clickedLink = eGainUI(this);

            // Retrieve all attributes of the clicked link
            const attributes = $clickedLink[0].attributes;

            // Create an object to store the attributes and their values
            const attributeValues = {};

            // Loop through the attributes and store them in the object
            eGainUI.each(attributes, function () {
              attributeValues[this.name] = this.value;
            });

            // Display the attributes and their values
            loadArticleLink(attributeValues);
          });
        } else if (isAbsoluteURL(href)) {
          // Add target="_blank" to open in a new tab/window
          eGainUI(this).attr("target", "_blank");
        }
      });
      eGainUI(".eGain-Search-Field-Input-text").blur();
      eGainUI(".eGain-Search-Suggetion-Results-Ul").remove();
      eGainUI(articleContainer).append(accordionHeaderDiv);
      generateArticleFooter(
        accordionArticleBodyContainer,
        item,
        dataitem,
        0,
        article
      );
      eGainUI(articleContainer).append(accordionArticleBodyContainer);
      eGainUI(item).append(articleContainer);
    },
  });
};

function isAbsoluteURL(url) {
  return /^(https?:\/\/|\/\/)/i.test(url);
}

const getPopularArticles = async (
  item,
  isAlternateIdEnabled,
  callback,
  index
) => {
  eGainUI.ajaxRequest({
    url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/dfaq`,
    data: {
      usertype: params.egainUserType,
      $attribute: "id,name",
      $lang: params.egainLocale,
    },
    success: function (data) {
      var popularArticlesHeader = eGainUI("<h1>", {
        html: "Popular Articles",
        class: "eGain-Popular-Articles-h1",
      });
      eGainUI(item).append(popularArticlesHeader);

      document
        .getElementById("eg-widget-modal")
        .classList.remove("loading-popular");

      generateAccordion(item, index, data, "popular-articles");
    },
    error: async function (xhr, status, error) {
      console.log("xhr", xhr);
      console.log("status", status);
      if (xhr.status === 401 && retryCount > 0) {
        // Retry the request with decreased retryCount
        await loginUser();
        makeAjaxRequest(url, requestData, retryCount - 1);
      } else {
        // Handle other error cases here
        console.error("Request failed with status code:",xhr.status,"Error:",xhr.responseText);
      }
    },
    complete: callback,
  });
};

function getFiletredSuggestions(suggestions) {
  const data = suggestions.filter(function (suggestion) {
    return suggestion.suggestionType === "Article";
  });
  return data;
}

const autocompleteReq = function (item, index, searchTerm) {
  eGainUI.ajaxRequest({
    url: `https://${v3apidomain}/knowledge/portalmgr/v3/portals/${params.egainPortalId}/search/typeahead`,
    data: {
      $lang: params.egainLocale,
      excludeType: "topic",
      maxCount: maxListSize,
      q: searchTerm,
    },
    success: function (response) {
      if (!eGainUI(item).find(".eGain-Search-Results-Ul").length) {
        searchResultsUl = eGainUI("<ul>", {
          id: "eGain-Search-Results-Ul-" + index,
          class: "eGain-Search-Results-Ul",
        });
        eGainUI(item).append(searchResultsUl);
      }
      eGainUI(".eGain-Search-Result-Field-Results-Ul").remove();
      eGainUI(".eGain-Search-Result-Field-Header").remove();
      eGainUI(".eGain-Search-Sugesstion-Result-Field-Header").remove();
      eGainUI(".eGain-Search-Result-Sugession-Field-Results-Ul").remove();
      if (response && response.suggestion.length) {
        const suggestions = getFiletredSuggestions(response.suggestion);
        if (suggestions.length && !eGainUI.isEnterKeyPressed) {
          const searchSuggetionResultsUl = eGainUI("<ul>", {
            id: "eGain-Search-Suggetion-Results-Ul-" + index,
            class: "eGain-Search-Suggetion-Results-Ul",
          });
          const searchSugesstionResultWidgetHeader = eGainUI("<div>", {
            class: "eGain-Search-Sugesstion-Result-Field-Header",
          });
          eGainUI(searchSuggetionResultsUl).append(
            searchSugesstionResultWidgetHeader
          );
          const searchResultSuggestionWidgetUl = eGainUI("<ul>", {
            id: "eGain-Search-Result-Sugession-Field-Results-Ul-" + index,
            class: "eGain-Search-Result-Sugession-Field-Results-Ul",
          });
          eGainUI(suggestions).each(function (dataindex, dataitem) {
            if (
              searchTerm.toLowerCase() === dataitem.suggestion.toLowerCase()
            ) {
              articleStack = [];
              loadArticlePageById(dataitem, item);
            }
            const searchResultSuggestionWidgetLi = eGainUI("<li>", {
              id: "eGain-Search-Result-Sugession-Field-Results-Li-" + dataindex,
              class: "eGain-Search-Result-Sugession-Field-Results-Li",
              "egain-article-identifier": dataitem.entityId,
              html: dataitem.suggestion,
            }).on("click keypress", function () {
              articleStack = [];
              loadArticlePageById(dataitem, item);
            });
            eGainUI(searchResultSuggestionWidgetUl).append(
              searchResultSuggestionWidgetLi
            );
          });
          eGainUI(searchResultSuggestionWidgetUl).insertAfter(
            searchSugesstionResultWidgetHeader
          );
          eGainUI("#eGain-Search-Field-Input-button-0").after(
            searchSuggetionResultsUl
          );
        }
      }
    },
    error: function (error) {
      console.log("error while calling autocomplete api", error);
    },
  });
};

const refreshAuthenticatedSession = async function () {
  try {
    retryCount += 1;
    const signUpSignInB2CPolicyName = "B2C_1A_User_V3_SignIn_OIDC";
    const clientId = params.egainClientId;
    const redirectUri = params.egainRedirectUri;

    const tokenUrl = `https://login.egain.cloud/${gatewayTenantId}/${signUpSignInB2CPolicyName}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      scope,
      refresh_token: tokenStorage.getRefreshToken(),
      grant_type: "refresh_token",
      redirect_uri: redirectUri,
    });
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers,
      body,
    });
    const responseJson = await response.json();
    tokenStorage.setTokens(
      responseJson.access_token,
      responseJson.refresh_token
    );
  } catch (error) {
    //if refresh fails, we will authenticate user again via B2c
    await loginUser();
  }
};

const getAnonymousCustomerSession = async function (item) {
  const body = new URLSearchParams({
    client_id: "DUMMY_VALUE_NEEDED",
    client_secret: "DUMMY_VALUE_NEEDED",
    grant_type: "client_credentials",
    scope,
  });
  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
    // "Access-Control-Allow-Origin": "*"
  };
  const response = await fetch(
    `https://${signUpSignInB2CPolicyAuthorityDomain}/internal/oauth2/v2.0/anonymous/token?domain_hint=${params.egainDomainHint}&user_type=customer`,
    {
      method: "POST",
      headers,
      body,
    }
  );
  const responseJson = await response.json();
  tokenStorage.setTokens(responseJson.access_token, "");
  eGainUI("#main-wrapper").show();
  eGainUI("#preloader").css("display", "none");
  await getConfigArticle();
};

console.log('host name',window.location.host);
// Declare and set default values for widget configuration

(function () {
  eGainUI(document).ready(function () {
    // Create the modal container
    const $modal = eGainUI("<div>", {
      id: "eg-widget-modal",
      class: "eg-widget-modal loading-config loading-search loading-popular"
    });

    // Create the modal content
    $modalContent = eGainUI("<div>", {
      id: "eg-widget-modal-content",
      class: "modal-content",
    });
    const innerContent = `
      <div id="eg-scrollable">
        <div>
        <div id="eg-search-field-widget-id" class="eg-search-field-widget-parent" data-egain-role="search-field-widget" data-egain-search-param="" data-egain-portal-id=${params.egainPortalId} data-egain-locale=${params.egainLocale} data-egain-template-name=${params.egainTemplateName} data-egain-domain-hint=${params.egainDomainHint} data-egain-client-id=${params.egainClientId} data-egain-redirect-uri=${params.egainRedirectUri} data-egain-user-type=${params.egainUserType}></div>
        <div id="HTML-element-Id" style="padding-left: 8px;" class="eg-popular-articles-parent" data-egain-role="popular-articles" data-egain-portal-id=${params.egainPortalId} data-egain-locale=${params.egainLocale} data-egain-template-name=${params.egainTemplateName} data-egain-domain-hint=${params.egainDomainHint} data-egain-client-id=${params.egainClientId} data-egain-redirect-uri=${params.egainRedirectUri} data-egain-user-type=${params.egainUserType}></div>
        </div>
      </div>
    `;
    $modalContent.append(innerContent);

    // Append elements to the DOM
    $modal.append($modalContent);
    eGainUI("body").append($modal);
    eGainUI("body").append($modal);
  });
})();


const getConfig = async () => {
  try {
    const fileUrl = `https://${params.egainWidgetDomain}/system/web/custom/v3kmwidget/askegain/web/widget/configuration.json`;
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch config file');
    }
    config = await response.json();
  } catch (error) {
    console.error('Error in getting config file', error);
    throw error;
  }
};
// Append footer items and apply configs
async function getConfigArticle() {
  const $footer = eGainUI("<div>", {
    id: "eg-footer",
    class: "footer",
  });
  try {
    if (config) {
      const { footerItems, styleOptions, textOptions,linkOptions } = config;
      if (!isConfigsApplied) {
        if (linkOptions) {
          linkOptions.surveyLink &&
            (surveyLink = linkOptions.surveyLink);
        }
        if (footerItems) {
          let footer = "";
          footerItems.forEach((item) => {
            let icon;
            switch (item.fieldType) {
              case "call":
                icon = "fa-phone";
                break;
              case "email":
                icon = "fa-envelope";
                break;
              case "faq":
                icon = "fa-question-circle";
                break;
              default:
                icon = "fa-globe";
            }
            footer += `
        <a class="footer-item" href=${item.href} target="_blank">
          <i class="fas ${icon}"></i>
          <p>${item.fieldName}</p>
      `;
          });
          $footer.html(footer);
        }
        if (styleOptions) {
          // Modal parent
          styleOptions.modalPosition && window.parent.postMessage(`egModalPosition::${styleOptions.modalPosition}`, '*');
          styleOptions.modalWidth && window.parent.postMessage(`egModalWidth::${styleOptions.modalWidth}`, '*');
          styleOptions.brandingColor && window.parent.postMessage(`egBrandingColor::${styleOptions.brandingColor}`, '*');
          styleOptions.headerFooterTextColor && window.parent.postMessage(`egHeaderFooterTextColor::${styleOptions.headerFooterTextColor}`, '*');
          styleOptions.headerFont && window.parent.postMessage(`egHeaderFont::${styleOptions.headerFont}`, '*');
          styleOptions.headerFontSize && window.parent.postMessage(`egHeaderFontSize::${styleOptions.headerFontSize}`, '*');

          // Modal internal
          styleOptions.maxListSize &&
            (maxListSize = styleOptions.maxListSize);
          styleOptions.modalBackgroundColor &&
            document.documentElement.style.setProperty(
              "--eg-modal-background-color",
              styleOptions.modalBackgroundColor
            );
          styleOptions.brandingColor &&
            document.documentElement.style.setProperty(
              "--eg-branding-color",
              styleOptions.brandingColor
            );
          styleOptions.headerFooterTextColor &&
            document.documentElement.style.setProperty(
              "--eg-header-footer-text-color",
              styleOptions.headerFooterTextColor
            );
          styleOptions.mainBackgroundColor &&
            document.documentElement.style.setProperty(
              "--eg-main-background-color",
              styleOptions.mainBackgroundColor
            );
          styleOptions.mainFont &&
            document.documentElement.style.setProperty(
              "--eg-main-font",
              styleOptions.mainFont
            );
          styleOptions.mainTextColor &&
            document.documentElement.style.setProperty(
              "--eg-main-text-color",
              styleOptions.mainTextColor
            );
          styleOptions.articleFooterLinkColor &&
            document.documentElement.style.setProperty(
              "--eg-article-footer-link-color",
              styleOptions.articleFooterLinkColor
            );
          styleOptions.mainFontSize &&
            document.documentElement.style.setProperty(
              "--eg-main-font-size",
              styleOptions.mainFontSize
            );
          styleOptions.headerFont &&
            document.documentElement.style.setProperty(
              "--eg-header-font",
              styleOptions.headerFont
            );
          styleOptions.headerFontSize &&
            document.documentElement.style.setProperty(
              "--eg-header-font-size",
              styleOptions.headerFontSize
            );
        }

        // Apply text
        if (textOptions) {
          // Modal parent
          textOptions.headerTitle && window.parent.postMessage(`egHeaderTitle::${textOptions.headerTitle}`, '*');
          textOptions.modalOpenLabel && window.parent.postMessage(`egModalOpenLabel::${textOptions.modalOpenLabel}`, '*');

          // Modal internal
          if (textOptions.placeholderText) {
            placeholderText = textOptions.placeholderText;
            let searchBar = document.getElementById(
              "eGain-Search-Field-Input-text-0"
            );
            if (searchBar) searchBar.placeholder = placeholderText;
          }
        }

        $modalContent.append($footer);
        window.parent.postMessage('egLoaded::egLoaded', '*');
        isConfigsApplied = true;
        document
          .getElementById("eg-widget-modal")
          .classList.remove("loading-config");
      } else {
        $modalContent.append($footer);
        window.parent.postMessage('egLoaded::egLoaded', '*');
        document
          .getElementById("eg-widget-modal")
          .classList.remove("loading-config");
      }
    } else {
      $modalContent.append($footer);
      window.parent.postMessage('egLoaded::egLoaded', '*');
      document
        .getElementById("eg-widget-modal")
        .classList.remove("loading-config");
    }
  } catch (error) {
    console.log("error in fetching config file", error);
  }
}
