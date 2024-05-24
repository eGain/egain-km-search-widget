## eGain-KM-Search-Widget

The eGain-KM-Search-Field-Widget boosts user experience by providing quick access to popular content and relevant information through an efficient search-driven approach. It eliminates the need for site navigation and decreases bounce rates. The widget is built using eGain Dev central V3 APIs, with an optimized user interface for easy use.

## Prerequisites

   * Required for both Authenticated and Non-Authenticated user types (In eGain Terminology - Agent and Anonymous Respectively)
      - eGain Domain Hint.
      - eGain Knowledge Base Portal ID.

   * Additional requirements for Authenticated user
     - Obtain the necessary Agent Login Credentials for accessing eGain.
     - Determine the Redirect Uri - (your web page url where the eGain widget is to be integrated).
     - Access the eGain Administration console and navigate to the partition settings.
     - Follow the guide [Create Client App](https://help.egain.com/mergedProjects/administration/creating_client_applications.htm) to configure a client application. Ensure that Knowledge read and manage scopes are enabled in the delegated settings.
     - Enable CORS for **your webserver domain** in the eGain application by following the provided instructions [here](https://help.egain.com/mergedProjects/administration/cors_enable.htm). For more information about CORS refer to CORS eGain APIs in [this](https://help.egain.com/mergedProjects/administration/cors_about.htm) guide.

## Installation and Usage
- To get started, ensure you have Node.js and npm installed on your machine.
1. Clone this repository to your local machine:

    ```bash
    git clone https://github.com/eGainDev/V3-Km-Widget.git
    ```
2. Navigate to the project directory:

    ```bash
    cd V3-Km-Widget
    ```
3. Install the required Node modules listed in the `package.json` file by moving to widget folder and run the following command:

    ```bash
    cd widget
    npm install
    ```

- This command will download and install all the dependencies needed for the project.

4. Copy the widget folder from the repo and place it **As Is** in your web server.
5. Use the generated URL referring to **egain-km-widget** file as an attribute value for **src** in step 4 as mentioned in the script tag.
6. Use the below script tag to add the widget to the web page where the widget is to be loaded, following the recommended placement:
    - Please use it in the header: If the JavaScript library is being used by making a javascript function call.
    - Please use it in the footer: If the page/document load event is used to trigger the widget.
    ## Anonymous
   
     ```JavaScript
        <script type="text/javascript" src="https://your_webserver_domain/widget/egain-km-widget.js"
        id="egain-widget-script" data-widget-domain="your_webserver_domain" data-portal-id="your_kb_portal_id" data-egain-locale="en-US" data-egain-template-name="silver" data-egain-domain-hint="your_domain_hint" data-egain-user-type="customer"></script>
     ```
   ## Agent
  
      ```JavaScript
         <script type="text/javascript" src="https://your_webserver_domain/widget/egain-km-widget.js"
         id="egain-widget-script" data-widget-domain="your_webserver_domain" data-portal-id="your_kb_portal_id" data-egain-locale="en-US" data-egain-template-name="silver" data-egain-domain-hint="your_domain_hint" data-egain-client-id="your_client_Id" data-egain-region="your_client_app_region" data-egain-redirect-uri="your_redirect_uri" data-egain-user-type="agent"></script>
    ```
5. Update the attributes within the script tag as follows to customize and load the HTML page to utilize the search widget functionalities:
   * Required for both Agent and Anonymous user type
      - `your_domain_hint`
      - `your_kb_portal_id`
      - `your_webserver_domain`
   * Agent
      - `Your_client_id`
      - `your_redirect_uri`
      - `your_client_app_region`
7. The widget will be loaded as a button with the title "Ask eGain" at the bottom of the web page.

## Placeholder HTML Element Attributes

|Attribute Name | Description | Type | Value | Default | Required |
|---------------|-------------|------|-------|---------|----------|
|data-egain-domain-hint |eGain server name. It is used to call the eGain V3 API's on this server.|	String	| E.g. domain.egain.com |	NONE |	Yes |
|data-widget-domain/your_webserver_domain |server domain name where the widget is deployed|	String	| E.g. NONE |	NONE |	Yes |
|data-egain-region | eGain Deployment Region | string	| E.g EMEA/US	| US	| Yes|
|data-egain-client-id | client Id generated when client app is created on eGain | string	| E.g e8448ea7-009d-4287-85b5-9b01ce0ef62c	| NONE	| Yes|
|data-egain-template-name|Template of the widget for display. It may be used to control the look and feel of the widget.|	String|	E.g. silver |	silver |	No |
|data-egain-locale | The locale of the knowledge data.|	String| Format "languagecode-CountryCode". E.g. "en-US". Should match with the MLKB language. | en-US|	No|
|data-egain-portal-id | Id of the Portal created through eGain KB console (confirm this with eGain deployment team). | Numeric	| E.g. 1000000000000	| NONE	| Yes|
|data-egain-user-type | The type of the user based on authorization. If the user is authenticated then the user type will be "agent" else it is "customer"| string	| agent/customer	| customer	| Yes|

## Features
  
- The click of a button reveals a search tab, popular articles, and contact channels.
    ![km-widget-popular-articles](https://github.com/eGain/egain-km-search-widget/assets/93939477/9c422aa3-7603-4565-acee-068d83c08bd5)

- Real-time suggestions appear on the search tab after entering at least 2 characters. 
  ![km-widget-realtime-suggestions](https://github.com/eGain/egain-km-search-widget/assets/93939477/90919b74-c370-4f4c-bb69-a2208af67e0e)

- The article offers options for rating and feedback via a survey and sharing capabilities through link copying or email.

  ![km-widget-article](https://github.com/eGain/egain-km-search-widget/assets/93939477/5f7fd0f8-c318-4883-9b27-63f4ca0f1b0c)


## L10N Support

By default, the widget will be loaded with en-US locale and the same will be passed to the V3 APIs.

## CSS Customization (Optional)

- The library will automatically add eGain-specific styling to each of the elements rendered. It also allows to customize the look & feel of the widget through customer-specific CSS placing the JSON in the URL
`https://your_widget/widget/configuration.json`
- Please refer to the configuration.json file in this repository under the widget folder for reference.
    - Fields of the configuration file
      - maxListSize - The maximum number of popular articles and the search results that the widget will load.
      - modalPosition - The position of the widget to appear on the website.
      - footerItems -  change the default href values for all the footer items that enable contact options.
      - styleOptions - The default font, color, size, and width can be changed to get the desired output.
      - linkOptions - The survey link is placed at the footer section of the article for feedback.

## Brief Over View of V3 APIs Used

Using V3 APIs simplifies the process of widget development by offering clear-cut tools and procedures. These APIs serve as fundamental components that developers can leverage to craft various features for widgets. 
APIs Used in Widget Development

 - **[Get Article By Id](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/operation/getArticleById/)**
   - This API allows you to retrieve a specific article using the portal ID and article ID. It is useful for displaying detailed information about a particular article.
 - **[Get Popular Articles](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/operation/getpopulararticles/)**
   - The Get Popular Articles API fetches trending and frequently accessed articles. This is beneficial for showcasing content that is currently in demand on the website.
- **[Multi-Search](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/operation/search/)**
   - The Multi-Search API enables you to perform search operations on articles, topics, and external/internal websites. It is versatile and powerful for comprehensive search functionality.
- **[Typeahead Suggestion](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/operation/typeaheadSuggestion/)**
   - Integrate the Typeahead Suggestion API for predictive search suggestions. This enhances the user experience by providing real-time suggestions as users type their queries. The user should at least enter 2 characters for the API to respond.
- **[Rate an Article](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/operation/rateArticle/)**
   - This API provides users with the capability to give ratings to an article, offering a valuable feedback mechanism.

## Additional Information

- If you encounter any issues during installation or while running the project, please raise an issue on the GitHub repository.

- For more information about Node.js and npm, visit their official websites:

  - [Node.js](https://nodejs.org/)
  - [npm](https://www.npmjs.com/)

- For more information about V3 APIs , refer [V3 API Guide](https://apidev.egain.com/api-catalog/knowledge-portalmgr/api-bundled/overview/)
