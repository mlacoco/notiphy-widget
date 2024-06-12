# Notiphy.me Widget 

## Overview
The Notiphy Widget is an embeddable Javascript component that aims to make it simple 
to add notifications to your site or web app. 

#### Demo
See a demo [here](https://notiphy.me/demo/).

## Installation
The easiest way to add the Notiphy widget is to use the CDN links below to include the widget in your HTML.

### CDN Links
 
- JS `https://cdn.notiphy.me/notiphy-widget.v1.1.umd.js`

  ```html
  <script src="https://cdn.notiphy.me/notiphy-widget.v1.1.umd.js"></script>
  ```

- CSS `https://cdn.notiphy.me/notiphy.min.css` 

  ```html
  <link rel="stylesheet" href="https://cdn.notiphy.me/notiphy.min.css">
  ```

### Download
Get the js and css files from the `/dist` directory and include them in your site.

### Build
#### Prerequisites
- Node.js 
- npm 
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
To initialize the Notiphy Widget, include the generated JavaScript and css files from the `dist` folder (or CDN) in your HTML, and initialize the widget.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Notiphy Widget</title>

    <!-- Include the widget css -->
    <link rel="stylesheet" href="/dist/notiphy.min.css">
</head>
<body>
    <!-- Existing document body -->
    ...
    
    <!-- Include the widget js -->
    <script src="dist/notiphy-widget.umd.js"></script>
    <script>
        // Initialize with default configuration.
        const notiphyConfig = {
            subscriberId: 'your-subscriber-id',
            widgetKey: 'your-api-key'
        }

        // Initialize the widget after the DOM has loaded.
        document.addEventListener('DOMContentLoaded', function () {
            new NotiphyWidget(notiphyConfig);
        });
    </script>
</body>
</html>
```

### Configuration Options
The Notiphy Widget can be configured with the following options:

- **subscriberId**: The subscriber ID for the notification service. (Required)
- **widgetKey**: The Widget API key for the notification service. (Required)
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
- **compact**: Compact mode. Relatively positioned in a container. Default is `false`.
- **targetElement**: Required for compact mode. The target element to render the widget in.

### Features

#### Inbox
The Inbox displays all received notifications. Users can mark notifications as read or dismiss them. The Inbox is toggled by clicking the widget icon.

#### Real-Time Notifications
The Notiphy Widget supports real-time notifications via WebSockets. Notifications are delivered to the widget without the need for manual refreshes, with polling as backup.

#### Toast Notifications
Toast notifications are brief messages that appear on the screen and fade out after a specified duration. You can customize the default position and duration of toast notifications through the widget configuration. Users can reposition toasts via the settings menu in the widget.

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
Blocker notifications are critical notifications that require user interaction before proceeding. They appear as modal dialogs that must be dismissed before continuing with other tasks. Use wisely.

#### Compact Mode
The widget can be rendered in a compact mode, a smaller, relatively positioned icon inside the specified container (`targetElement`). By default the widget is rendered in a fixed position at the bottom right of the screen.

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
    <script src="/dist/notiphy-widget.umd.js"></script>
    <script>
        // Initialize with default configuration.
        const widget = new NotiphyWidget({
            subscriberId: 'your-subscriber-id',
            widgetKey: 'your-api-key',
        });
    </script>
</body>
</html>
```
### Customize defaults

To customize the widget, modify the configuration options passed during initialization. For example, to enable audio alerts and set the toast position to the top-right:

```javascript
// Initialize with additional configuration options
const widget = new NotiphyWidget({
    subscriberId: 'your-subscriber-id',
    widgetKey: 'your-api-key',
    audioAlert: true,          // load widget with audio enabled.
    toastAlert: true,          // load widget with toasts enabled.
    toastPosition: 'top-right' // set toast position to top-right.
});
```
Compact mode example.  Renders the widget in a relatively positioned target element. The target element can be any element, but should be relatively positioned.
```javascript
// Initialize with additional configuration options
const widget = new NotiphyWidget({
    subscriberId: 'your-subscriber-id',
    locationId: 'user@domain.com',      // initialize for a particular user.
    widgetKey: 'your-api-key',
    audioAlert: true,                   // load widget with audio enabled.
    toastAlert: true,                   // load widget with toasts enabled.
    toastPosition: 'top-center',        // set toast position to top-center.
    compact: true,                      // load widget in compact mode.
    targetElement: '.notiphy-container' // target element to render widget in.
});
```


