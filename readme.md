# Notiphy.me Widget 

## Overview
The Notiphy Widget is a notification system designed to integrate seamlessly into your web applications. It provides real-time notifications and flexible
configuration options.

## Installation
The easiest way to add the Notiphy widget is to use the CDN links below to include the widget in your HTML.

### CDN (JSDelivr)
 
- `https://cdn.jsdelivr.net/gh/mlacoco/notiphy-widget@1.0.1/dist/notiphy-widget.umd.js`


- `https://cdn.jsdelivr.net/gh/mlacoco/notiphy-widget@1.0.1/dist/style.css`

```html
<script src="https://cdn.jsdelivr.net/gh/mlacoco/notiphy-widget@1.0.1/dist/notiphy-widget.umd.js"></script>

<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/mlacoco/notiphy-widget@1.0.1/dist/style.css">
```

### Or build it yourself
#### Prerequisits
- Node.js (version 14 or later)
- npm (Node Package Manager)
- Vite (for bundling and packaging)

#### Setup

1. **Clone the Repository**
    ```bash
    git clone https://github.com/mlacoco/notiphy-widget.git
    cd notiphy-widget
    ```

2. **Install Dependencies**
    ```bash
    npm install
    ```

3. **Run Development Server**
    ```bash
    npm run dev
    ```

4. **Build for Production**
    ```bash
    npm run build
    ```

## Usage

### Initialization
To initialize the Notiphy Widget, include the generated JavaScript and css files from the `dist` folder (or CDN) in your HTML, and configure the widget as follows:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notiphy Widget</title>
    <link rel="stylesheet" href="/dist/style.css">
</head>
<body>
    <div id="notiphy-widget"></div>
    <script src="dist/notiphy-widget.umd.js"></script>
    <script>
        const widget = new NotiphyWidget({
            tenant: 'your-tenant-id',
            apiKey: 'your-api-key',
            locationId: 'default',          // Optional
            widgetTitle: 'Inbox',           // Optional
            audioAlert: false,              // Optional
            audioReminder: false,           // Optional
            reminderInterval: 180,          // Optional
            toastAlert: false,              // Optional
            toastPosition: 'bottom-right',  // Optional
            toastDuration: 4,               // Optional
            showInboxOnLoad: false,         // Optional
            refreshInterval: 0              // Optional
        });
    </script>
</body>
</html>
```

### Configuration Options
The Notiphy Widget can be configured with the following options:

- **tenant**: The tenant ID for the notification service. (Required)
- **apiKey**: The API key for the notification service. (Required)
- **locationId**: The location ID for the notification service. Default is 'default'.
- **widgetTitle**: The title to be displayed in the Inbox. Default is 'Inbox'.
- **audioAlert**: Whether to play a sound when a new notification is received. Default is `false`.
- **audioReminder**: Whether to play an audible reminder of unread notifications at the specified interval. Default is `false`.
- **reminderInterval**: Interval in seconds to play the reminder sound. Default is `180` seconds (3 minutes).
- **toastAlert**: Whether to display a toast notification when a new notification is received. Default is `false`.
- **toastPosition**: Position of the toast notifications. Default is `bottom-right`.
- **toastDuration**: Duration in seconds for how long the toast notification is displayed. Default is `4` seconds.
- **showInboxOnLoad**: Whether to show the Inbox by default when the widget loads. Default is `false`.
- **refreshInterval**: For use in SPA's. Interval in seconds to refresh the Inbox. Default is `0`. If specified, minimum value is `300` (5 minutes) (no auto-refresh). Clears expired notifications from the inbox, nothing else.

### Features

#### Real-Time Notifications
The Notiphy Widget supports real-time notifications via WebSockets. Notifications are delivered instantly to the widget without the need for manual refreshes.

#### Toast Notifications
Toast notifications are brief messages that appear on the screen and fade out after a specified duration. You can customize the position and duration of toast notifications through the widget configuration.

#### Inbox
The Inbox displays all received notifications. Users can mark notifications as read or dismiss them. The Inbox can be opened and closed by clicking the widget icon.

#### Audio Alerts and Reminders
The widget can play a sound when a new notification is received (audioAlert) and can also play a reminder sound at specified intervals if there are unread notifications (audioReminder).

#### Alert Levels
The following alert levels are supported, with appropriate styling.
- **Null/not specified**: unstyled/gray
- **primary**: Dark Blue
- **info**: Blue
- **success**: Green
- **warning**: Yellow
- **error**: Red
- **blocker**: Red + modal

#### Configurable Positions and Durations
Toast notifications can be configured to appear in different positions on the screen, and their duration can be adjusted according to user preferences.

#### Blocker Notifications
Blocker notifications are critical notifications that require user interaction before proceeding. They appear as modal dialogs that must be dismissed before continuing with other tasks.

### API Integration
The Notiphy Widget integrates with the Notiphy.me service API. Use the api to further customize the widget, or build your own. 

### Example Usage

To use the Notiphy Widget, include the necessary CSS and JS files in your HTML, and initialize the widget with your configuration. A demo API key is provided for development purposes, and will not work in production (localhost only).

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notiphy Widget Example</title>
    <link rel="stylesheet" href="/dist/style.css">
</head>
<body>
    <div id="notiphy-widget"></div>
    <script src="/dist/notiphy-widget.umd.js"></script>
    <script>
        // Initialize with default configuration.
        const widget = new NotiphyWidget({
            tenant: 'your-tenant-id',
            apiKey: 'your-api-key',
        });
    </script>
</body>
</html>
```
### Customization

To customize the widget, modify the configuration options passed during initialization. For example, to enable audio alerts and set the toast position to the top-right:

```javascript
// Initialize with additional configuration options
const widget = new NotiphyWidget({
    tenant: 'your-tenant-id',
    apiKey: 'your-api-key',
    audioAlert: true, // load widget with audio enabled.
    toastAlert: true, // load widget with toasts enabled.
    toastPosition: 'top-right' // set toast position to top-right.
});
```
### Conclusion

The Notiphy Widget is a powerful and flexible notification solution for your web applications. By following the setup and usage instructions provided in this documentation, you can quickly integrate and customize the widget to meet your notification needs.
