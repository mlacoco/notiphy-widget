/**
 * The `NotiphyWidget` class is responsible for creating and managing a notification widget in the user interface.
 * It handles the creation of DOM elements, setting up event listeners, and displaying notifications.
 *
 * The widget connects to a WebSocket server to receive real-time notifications, and provides options to toggle audio and toast alerts.
 * Notifications can be marked as read or dismissed, and the notification center can be toggled to show all received notifications.
 *
 * @class NotificationWidget
 * @param {Object} config ................. The configuration object for the notification widget.
 * @param {string} config.serviceUrl ...... The base URL for the notification service.
 * @param {string} config.subscriberId .......... The subscriberId for the notification service.
 * @param {string} config.widgetKey ....... The widget API key for the notification service.
 * @param {string} config.locationId ...... The location ID for the notification service.
 * @param {string} config.widgetTitle ..... The title to be displayed in the notification center.
 * @param {boolean} config.audioAlert ..... Whether to play a sound when a new notification is received.
 * @param {boolean} config.audioReminder .. Whether to play a verbal reminder of unread notifications at the specified interval (or 3 minute default).
 * @param {number} config.reminderInterval  Interval in seconds to play the reminder sound (default: 180/3minutes, no minimum).
 * @param {boolean} config.toastAlert ..... Whether to display a toast notification when a new notification is received.
 * @param {string} config.toastPosition ... The position of the toast notification (default: "top-right").
 * @param {number} config.toastDuration ... The duration in seconds to display the toast notification (default: 4s).
 * @param {string} config.width ........... The width of the notification center (default: "300px").
 * @param {string} config.height .......... The height of the notification center (default: "400px").
 * @param {boolean} config.showInboxOnLoad  Whether to show the notification center by default (default: false).
 * @param {number} config.refreshInterval . Interval in seconds to refresh the notification center (minimum 300/5minutes if specifed).
 */

// import all audio files for Vite to process.
import clickOff from '../assets/audio/clickOff.mp3';
import clickOn from '../assets/audio/clickOn.mp3';
import crumple from '../assets/audio/crumple.mp3';
import ding from '../assets/audio/ding.mp3';
import dismiss from '../assets/audio/dismiss.mp3';
import notifications_waiting from '../assets/audio/notifications-waiting.mp3';
import phoneVibrate from '../assets/audio/phone-vibrate.mp3';
import ping from '../assets/audio/ping.mp3';
import pop from '../assets/audio/pop.mp3';
import start from '../assets/audio/start.mp3';
import whoosh from '../assets/audio/whoosh.mp3';

// import css for Vite to process.
import '../styles/notiphy.base.css';
import '../styles/notiphy.compact.css';
export default class NotiphyWidget {
    constructor(config) {
        this.defaultConfig = {
            serviceUrl: 'https://app.notiphy.me',
            subscriberId: null,
            widgetKey: null,
            locationId: "default",
            widgetTitle: "Inbox",
            audioAlert: false,
            audioReminder: false,
            reminderInterval: 180,
            toastAlert: false,
            toastPosition: "bottom-right",
            toastDuration: 4,
            width: "300px",
            height: "400px",
            showInboxOnLoad: false,
            refreshInterval: 0,
            branded: true,  // New option
            compact: false,  // New option
            targetElement: null  // New option
        };
        
        this.initialConfig = { ...this.defaultConfig, ...config };
        this.config = this.loadSettings() || this.initialConfig;
        this.notifications = this.loadNotifications() || [];
        this.checkLocationChange();
        this.saveSettings();
        
        // Check for required fields
        if (!this.config.subscriberId) {
            console.error("subscriberId is required.");
            return;
        }
        
        if (!this.config.widgetKey) {
            console.error("API Key is required.");
            return;
        }
        
        this.socket = null;
        this.notificationsLoaded = false;
        this.reminderIntervalId = null;
        this.createDomElements();
        this.setupPeriodicRefresh(); // Refresh the notifications every so often to check for expired notifications.
        this.setupAudioReminders(); // Play a reminder sound if there are unread notifications.

        // Fetch notifications on initialization
        this.fetchNotifications();
    }

    /**
     * Saves user preferences (audio, toast, reminders)
     */
    saveSettings() {
        // console.log('Saving settings:', this.config); // Debugging log
        localStorage.setItem('notiphySettings', JSON.stringify(this.config));
    }
    loadNotifications() {
        return JSON.parse(sessionStorage.getItem('notiphyWidgetNotifications')) || [];
    }
    /**
     * Loads user preferences (audio, toast, reminders)
     */
    loadSettings() {
        // const settings = sessionStorage.getItem('notiphySettings');
        // console.log('Loaded settings:', settings); // Debugging log
        // return settings ? JSON.parse(settings) : null;
        const storedSettings = localStorage.getItem('notiphySettings');
        if (storedSettings) {
            const parsedSettings = JSON.parse(storedSettings);
            // Overwrite locationId if it doesn't match
            if (this.initialConfig.locationId !== parsedSettings.locationId) {
                parsedSettings.locationId = this.initialConfig.locationId;
            }
            return parsedSettings;
        }
        return null;
    }

    saveNotifications(notifications) {
        sessionStorage.setItem('notiphyWidgetNotifications', JSON.stringify(notifications));
    }

    checkLocationChange() {
        const storedSettings = JSON.parse(localStorage.getItem('notiphySettings'));
        // console.log(storedSettings.locationId);
        if (storedSettings && this.config.locationId !== storedSettings.locationId) {
            this.clearStoredData();
        }
    }

    clearStoredData() {
        sessionStorage.removeItem('notiphyWidgetNotifications');
        localStorage.removeItem('notiphyWidgetLastFetched');
    }
    /**
     * Resets the settings by clearing localStorage and reloading default configuration.
     */
    resetSettings() {
        // console.log('Resetting settings to initial configuration.'); // Debugging log
        sessionStorage.removeItem('notiphyWidgetNotifications');
        localStorage.removeItem('notiphyWidgetLastFetched');
        localStorage.removeItem('notiphySettings');
        this.config = { ...this.initialConfig };
        this.playClickOffSound();
        this.saveSettings();
        console.log('Settings have been reset to default.');
        location.reload(); // Reload the page to apply default settings
    }

    /**
     * Refreshes the notification center periodically to avoid expired notifications. Once expired, they're removed
     * from the database. Use this periodic check to remove expired notifications from the notification center.
     * This method is called once per minute by default.
     */
    setupPeriodicRefresh() {
        const refreshInterval = this.config.refreshInterval // Refresh interval in seconds.
        if (refreshInterval) {
            setInterval(() => {
                this.fetchNotifications();
            }, Math.max(300000,(refreshInterval * 1000))); // Min. refresh interval 5m (300,000ms)
            console.log("Auto-refresh enabled:", Math.max(300 / 60,(refreshInterval / 60)),'minutes.');
        }
    }

    /**
     * Periodically checks for unread messages and plays an audio reminder.
     * If sound is off and reminders on, plays a silent reminder (phone vibrate sound).
     *  */
    setupAudioReminders () {
        const audioReminder = this.config.audioReminder;
        const reminderInterval = this.config.reminderInterval || 180; // Default to 3 minutes if not provided
        
        if (audioReminder && !this.reminderIntervalId) {
            this.reminderIntervalId = setInterval(() => {
                this.playReminderSound();
            }, reminderInterval * 1000); // No minimum for reminders, as they're local.

            console.log("Reminders on:",reminderInterval,"seconds.");
        }
    }

    /**
     * Creates the necessary DOM elements for the notification widget, including the Socket.IO script,
     * the widget's CSS, the notification icon, the toaster, and the notification center.
     */
    createDomElements() {
        // Create the Socket.IO script, and let it load first thing.
        const ioScript = document.createElement("script");
        ioScript.src = "https://cdn.socket.io/4.0.0/socket.io.min.js";
        ioScript.onload = () => this.onSocketIoLoaded();
        document.head.appendChild(ioScript);

        // Create the widget icon. This is what the user clicks on to toggle the inbox.
        const notificationIcon = document.createElement("div");
        notificationIcon.className = "notiphy-icon";
        
        // Check for compact mode
        if (this.config.compact) {
            notificationIcon.classList.add("notiphy-compact");
        }

        // Add the bell and unread-count badge.
        notificationIcon.innerHTML = `<i class="material-symbols-outlined" title="Notifications">notifications</i>`
                                    + `<div class="notiphy-notification-count" style="display:none;">0</div>`;
    
        // Create the toaster. This is the element that displays the toast notifications.
        const toaster = document.createElement("div");
        toaster.className = `notiphy-toaster ${this.config.toastPosition || 'top-right'}`;
        document.body.appendChild(toaster);
    
        // Create the notification center (Inbox). This is the element that contains all [not:dismissed] notifications.
        const notificationCenter = document.createElement("div");
        notificationCenter.id = "notiphy-notification-center";
        // Check for compact mode.
        if (this.config.compact) {
            notificationCenter.classList.add("notiphy-compact");
        }
        notificationCenter.style.width = this.config.width || "300px";
        notificationCenter.style.height = this.config.height || "400px";
        notificationCenter.innerHTML = ``
            // Header
            + `<div class="notiphy-notification-center-header">`
                + `<span class="notiphy-notification-center-stats-unread">0</span> <span class="notiphy-notification-center-title">${this.config.widgetTitle}</span>`
                + `<i class="notiphy-button-settings material-symbols-outlined" title="Settings">settings</i>`
                + `<i class="notiphy-button-divider"></i>`
                + `<i class="notiphy-button-close material-symbols-outlined" title="Close">close</i>`
            + `</div>`
            // Settings dropdown
            + `<div class="notiphy-settings-dropdown">`
                + `<div class="notiphy-settings-dropdown-item" id="audio-alert-item">`
                    + `Sound <i class="notiphy-button-audio-alert material-symbols-outlined ${this.config.audioAlert ? 'notiphy-enabled' : ''}" title="${this.config.audioAlert ? 'Sound on' : 'Muted'}">${this.config.audioAlert ? 'volume_up' : 'volume_off'}</i>`
                + `</div>`
                + `<div class="notiphy-settings-dropdown-item" id="audio-reminder-item">`
                    + `Reminders <i class="notiphy-button-audio-reminder material-symbols-outlined ${this.config.audioReminder ? 'notiphy-enabled' : ''}" title="${this.config.audioReminder ? 'Reminders on' : 'Reminders off'}">${this.config.audioReminder ? 'alarm_on' : 'alarm_off'}</i>`
                + `</div>`
                + `<div class="notiphy-settings-dropdown-item" id="toast-alert-item">`
                    + `Alerts <i class="notiphy-button-show-toasts material-symbols-outlined ${this.config.toastAlert ? 'notiphy-enabled' : ''}" title="Toast notifications">position_top_right</i>`
                + `</div>`
                + `<div class="notiphy-settings-dropdown-item" id="toast-position-item">`
                    + `Alert Position <span class="notiphy-button-toast-position material-symbols-outlined">${this.getToastPositionIcon()}</span>`
                + `</div>`
            + `</div>`
            // Notification center body
            + `<div class="notiphy-notification-center-body"></div>`
            // Footer
            + `<div class="notiphy-notification-center-footer">`
                + `<i class="notiphy-button-mark-all-read material-symbols-outlined" title="Mark ALL read">mark_chat_read</i>`
                + `<i class="notiphy-button-divider"></i>`
                + `<i class="notiphy-button-dismiss-all material-symbols-outlined" title="Dismiss ALL">delete_sweep</i>`
                + `<span class="notiphy-notification-center-logo">${!this.config.branded ? '' : 'Notiphy.me'}</span>`
                + `<span class="notiphy-notification-center-connect-status" title="Offline"></span>`
            + `</div>`
            + `<div class="notiphy-notification-center-stats">`
            + `Inbox: <span class="notiphy-notification-center-stats-total">0</span>`
            + `<span class="notiphy-notification-center-connection"></span>`
            + `</div>`;

        // If compact mode and we have a target element, add the icon and inbox to the target
        // for relative positioning, otherwise add the icon and inbox to the body.
        if (this.config.compact && this.config.targetElement) {
            const target = document.querySelector(this.config.targetElement);
            if (target) {
                target.appendChild(notificationIcon);
                target.appendChild(notificationCenter);
            } else {
                console.warn('Target element not found for Notiphy Widget compact view.');
            }
        } else {
            document.body.appendChild(notificationIcon);
            document.body.appendChild(notificationCenter);
        }
        
        // Create the settings dropdown menu
        const settingsButton = document.querySelector('.notiphy-button-settings');
        const settingsDropdown = document.querySelector('.notiphy-settings-dropdown');
        settingsButton.addEventListener('click', (event) => {
            event.stopPropagation();
            settingsDropdown.classList.toggle('show');
        });
        // Add event listener to close the dropdown when clicking outside
        document.addEventListener('click', (event) => {
            if (!settingsDropdown.contains(event.target) && !settingsButton.contains(event.target)) {
                settingsDropdown.classList.remove('show');
            }
        });
    
        // This ensures that clicking on the .notiphy-settings-dropdown-item elements triggers the corresponding button click events.
        document.getElementById('audio-alert-item').addEventListener('click', () => {
            this.toggleAudioAlert();
            this.updateSettingsDropdown();
        });
        
        document.getElementById('audio-reminder-item').addEventListener('click', () => {
            this.toggleAudioReminder();
            this.updateSettingsDropdown();
        });
        
        document.getElementById('toast-alert-item').addEventListener('click', () => {
            this.toggleToastAlert();
            this.updateSettingsDropdown();
        });
        
        document.getElementById('toast-position-item').addEventListener('click', () => {
            this.changeToastPosition();
            this.updateSettingsDropdown();
        });
    
        const closeButton = document.querySelector('.notiphy-button-close');
        closeButton.addEventListener('click', () => this.toggleNotificationCenter());
        
         // Add theme selector to settings dropdown
        const themeSelectorItem = document.createElement('div');
        themeSelectorItem.className = 'notiphy-settings-dropdown-item';
        themeSelectorItem.id = 'theme-selector-item';
        themeSelectorItem.innerHTML = `Display Mode <span class="notiphy-button-display-mode material-symbols-outlined" title="Change display mode">${this.getDisplayModeIcon()}</span>`;
        settingsDropdown.appendChild(themeSelectorItem);

        // Add event listener for display mode button
        document.getElementById('theme-selector-item').addEventListener('click', () => {
            this.changeDisplayMode();
            this.updateSettingsDropdown();
        });


        // Add reset item
        const resetItem = document.createElement('div');
        resetItem.className = 'notiphy-settings-dropdown-item';
        resetItem.id = 'reset-settings-item';
        resetItem.innerHTML = `Reset Settings <span class="material-symbols-outlined" title="Reset">restart_alt</span>`;
        settingsDropdown.appendChild(resetItem);
        
        document.getElementById('reset-settings-item').addEventListener('click', () => {
            this.resetSettings();
            this.updateSettingsDropdown();
        });
    
        // create the blocker modal.
        const blockerModal = document.createElement("div");
        blockerModal.className = "notiphy-modal";
        blockerModal.id = "notiphy-blocker-modal";
        blockerModal.innerHTML = ``
            + `<div class="notiphy-modal-content">`
            +   `<div class="notiphy-modal-header">`
            +       `<span class="notiphy-close-button">&times;</span>`
            +       `<i class="material-symbols-outlined">crisis_alert</i>`
            +       `<span id="blocker-title">Critical Alert</span>`
            +   `</div>`
            +   `<p id="blocker-text">This is a blocker notification.</p>`
            +   `<div class="notiphy-modal-footer">`
            +       `<button class="notiphy-btn" id="blocker-dismiss-button">Close</button>`
            +   `</div>`
            + `</div>`;
        document.body.appendChild(blockerModal);

        initializeTheme();
    }

    // gets the appropriate icon for toast position
    getToastPositionIcon() {
        const positionIcons = {
            'bottom-right': 'south_east',
            'bottom-center': 'south',
            'bottom-left': 'south_west',
            'top-right': 'north_east',
            'top-center': 'north',
            'top-left': 'north_west'
        };
        return positionIcons[this.config.toastPosition] || 'south_east';
    }
    getDisplayModeIcon() {
        const displayModeIcons = {
            'light': 'light_mode',
            'dark': 'dark_mode',
            'auto': 'night_sight_auto'
        };
        const currentTheme = localStorage.getItem('notiphy-theme') || themes.LIGHT;
        return displayModeIcons[currentTheme];
    }
    // updates settings icons appropriately
    updateSettingsDropdown() {
        document.querySelector('.notiphy-button-audio-alert').innerHTML = this.config.audioAlert ? 'volume_up' : 'volume_off';
        document.querySelector('.notiphy-button-audio-reminder').innerHTML = this.config.audioReminder ? 'alarm_on' : 'alarm_off';
        document.querySelector('.notiphy-button-show-toasts').innerHTML = 'position_top_right';
        const toastPositionButton = document.querySelector('.notiphy-button-toast-position');
        toastPositionButton.innerHTML = this.getToastPositionIcon();
        const displayModeButton = document.querySelector('.notiphy-button-display-mode');
        displayModeButton.innerHTML = this.getDisplayModeIcon();

    }
    
    /**
     * Handles the event when Socket.IO is loaded and connected.
     */
    onSocketIoLoaded() {
        const options = {
            transportOptions: {
                polling: {
                    extraHeaders: {
                        'x-api-key': `${this.config.widgetKey}`,
                        'x-subscriber-id': `${this.config.subscriberId}`,
                        'x-location-id': `${this.config.locationId}`,
                    }
                }
            }
        };

        this.socket = io(`${this.config.serviceUrl}/${this.config.subscriberId}`, options);

        this.socket.on('connect', async () => {
            // console.log('Connected to subscriberId:', this.config.subscriberId);
            this.socket.emit('joinRoom', this.config.locationId);
            
            // this.playStartSound();
            await this.fetchNotifications()

             // Fetch notifications on initial connection
            this.updateConnectionStatus(`Online: ${this.config.locationId}`);
        });

        this.socket.on("notification", (notification) => {
            if (this.config.audioAlert) {
                // this.playPopSound();
            }
            this.handleNotification(notification);
        });

        this.socket.on("dismiss", (notificationId) => {
            this.handleDismissedNotification(notificationId);
        });

        this.socket.on("mark-read", (notificationId) => {
            this.handleMarkedReadNotification(notificationId);
        });

        this.socket.on("connect_error", (error) =>
            console.error("Unable to connect to Notiphy.me:", error)
        );

        this.socket.on("disconnect", () => {
            this.updateConnectionStatus(`Offline`);
        });
        this.setupEventListeners();
    }

    /**
     * Notification handler. Displays the notification according to configuration.
     */
    handleNotification(notification) {
        let delay = 0
        if (notification.alertLevel === 'blocker') {
            this.showBlockerModal(notification);  // show the blocker modal
        } else {
            if (this.config.toastAlert) {
                this.showToast(notification); // show the toast.
                delay = this.config.toastDuration * 1000; // set the delay to the toast duration
            }
        }
        setTimeout(() => {
             this.addToNotiphyCenter(notification); // add to inbox
             this.playPopSound(); // play pop sound
        }, delay);
    }

    /**
     * display blocker modal for "blocker" level notifications.
     */
    showBlockerModal(notification) {
        const modal = document.getElementById("notiphy-blocker-modal");
        const title = document.getElementById("blocker-title");
        const text = document.getElementById("blocker-text");
        const closeButton = document.querySelector(".notiphy-close-button");
        const dismissButton = document.getElementById("blocker-dismiss-button");
        const notificationId = notification.id;
        title.textContent = notification.title;
        text.textContent = notification.text;

        const closeModal = () => {
            modal.classList.add("fade-out");
            setTimeout(() => {
                modal.style.display = "none";
                modal.classList.remove("fade-out");
                // this.handleMarkedReadNotification(notificationId); // mark the notification as read when the blocker modal is dismissed.
            }, 500); // Match this duration with the fadeOut animation duration
        };
    
        closeButton.onclick = dismissButton.onclick = closeModal;
        
        this.playPingSound();
        modal.style.display = "block";
    }

    /**
     * Handles the logic when a notification is marked as read by a different widget.
     * @param {string} notificationid - The ID of the notification that was marked as read.
     */
    handleMarkedReadNotification(notificationid) {
        const notificationElements = document.querySelectorAll(`[data-notification-id="${notificationid}"]`);
        if (!notificationElements.length) {
            return;
        }
        const markReadButton = Array.from(notificationElements).find((element) =>
            element.classList.contains("notiphy-button-mark-read")
        );
        const isRead = markReadButton.classList.contains("open");

        if (!isRead) {
            markReadButton.classList.add("open");
            markReadButton.innerHTML = "mark_chat_read";
            markReadButton.parentNode.parentNode.parentNode.classList.add("notiphy-read");
        }
        
        // update the notification's icon to show that the notification has been read
        // Find the icon and update its innerText
        const iconElement = markReadButton.closest(".notiphy-notification-element").querySelector(".notiphy-notification-left i");
        if (iconElement) {
            iconElement.innerText = "notifications";
        }
        this.updateStatsAfterMarkRead(isRead);
        this.updateLocalNotification(notificationid, { read: true });
    }

    /**
     * Handles the dismissal of a notification by another widget.
     * @param {string} notificationId - The ID of the notification to be dismissed.
     */
    handleDismissedNotification(notificationId) {
        const notificationElements = document.querySelectorAll(`[data-notification-id="${notificationId}"]`);
        if (!notificationElements.length) {
            return;
        }
        const markReadButton = Array.from(notificationElements).find((element) =>
            element.classList.contains("notiphy-button-mark-read")
        );
        const isRead = markReadButton.classList.contains("open");
        notificationElements.forEach((element) => {
            element.closest(".notiphy-notification-element").remove();
        });
        this.updateStatsAfterDismissal(isRead);
        // Remove the notification from local storage
        this.removeLocalNotification(notificationId);
    }

    /**
     * Updates the unread and total notification counts after a notification is dismissed.
     * @param {boolean} [isRead=false] - Indicates whether the notification was marked as read.
     * @returns {void}
     */
    updateStatsAfterDismissal(isRead = false) {
        // Update unread and total count appropriately
        if (!isRead) {
            const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread");
            let unreadCount = parseInt(unreadCountElement.textContent);
            unreadCount = Math.max(0, unreadCount - 1);
            this.updateUnreadCount(unreadCount);
        }

        // Update total count appropriately
        const totalCountElement = document.querySelector(".notiphy-notification-center-stats-total");
        let totalCount = parseInt(totalCountElement.textContent);
        totalCount = Math.max(0, totalCount - 1);
        totalCountElement.textContent = totalCount;
    }

    /**
     * Updates the unread notification count after a notification has been marked as read.
     * @param {boolean} [isRead=false] - Indicates whether the notification has been marked as read.
     */
    updateStatsAfterMarkRead(isRead = false) {
        // Update unread and total count appropriately
        if (!isRead) {
            const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread");
            let unreadCount = parseInt(unreadCountElement.textContent);
            unreadCount = Math.max(0, unreadCount - 1);
            this.updateUnreadCount(unreadCount);
        }
    }

    /**
     * Sets up event listeners for the notification widget.
     */
    setupEventListeners() {
        const icon = document.querySelector(".notiphy-icon");
        icon.addEventListener("click", () => this.toggleNotificationCenter());

        const dismissAllButton = document.querySelector(".notiphy-button-dismiss-all");
        dismissAllButton.addEventListener("click", () => this.dismissAllNotifications());

        const connectButton = document.querySelector(".notiphy-notification-center-connect-status");
        connectButton.addEventListener("click", () => this.toggleConnection());
    
        document.body.addEventListener("click", (event) => {
            if (event.target.classList.contains("notiphy-button-mark-read") && !event.target.classList.contains('open')) {
                const notificationId = event.target.getAttribute("data-notification-id");
                this.markRead(notificationId, event.target);
                this.playClickOffSound();
            } else if (event.target.classList.contains("notiphy-button-dismiss")) {
                const notificationId = event.target.getAttribute("data-notification-id");
                if (event.target.closest('.notiphy-toast')) {
                    // Dismiss button clicked on a toast
                    this.dismissToast(event.target.closest('.notiphy-toast'));
                } else {
                    // Dismiss button clicked in the notification center
                    this.dismissNotification(notificationId, event.target);
                    this.playDismissSound();
                }
            } else if (event.target.classList.contains("notiphy-button-mark-all-read")) {
                this.markAllRead();
            }
        });
    }

    /**
     * Dismisses the toast from view without affecting the notification status in the database.
     * @param {HTMLElement} toastElement - The DOM element representing the toast to dismiss.
     */
    dismissToast(toastElement) {
        const toaster = document.querySelector(".notiphy-toaster");
        toastElement.classList.add("hide");  // Trigger the hide animation
        setTimeout(() => {
            if (toastElement.parentNode) {  // Ensure the toast is still in the DOM
                toaster.removeChild(toastElement);  // Remove the toast from the DOM after the animation
            }
        }, 300);  // Sync this timeout with your CSS animation duration
    }

    /**
     * Displays a notification on the toaster.
     * @param {Object} notification - The notification object to be displayed.
     */
    showToast(notification) {
        const toaster = document.querySelector(".notiphy-toaster");
        const notificationElement = this.assembleToast(notification);
        toaster.insertBefore(notificationElement, toaster.firstChild);
    
        let toastTimeout;
        let startTime = Date.now();
        let remainingTime = (this.config.toastDuration || 4) * 1000; // default to 4000ms (4 seconds)
        const uniqueClass = `toast-duration-${Date.now()}`;
        const alertLevel = notification.alertLevel || 'info'; // default to info color
        const alertColorVariable = `--notiphy-${alertLevel}-color`;
    
        // Create a style tag with the unique class
        const style = document.createElement('style');
        style.innerHTML = ``
            + `.${uniqueClass} .progress:before {`
            + `animation: progress ${remainingTime}ms linear forwards !important;`
            + `background-color: rgba(var(${alertColorVariable}), 1) !important;`
            + `}`
            + `.${uniqueClass}.paused .progress:before {`
            + `animation-play-state: paused !important;`
            + `}`;
        document.head.appendChild(style);
    
        // Add the unique class to the notification element
        notificationElement.classList.add(uniqueClass);
        notificationElement.__styleElement = style; // Store reference to remove later
    
        setTimeout(() => {
            notificationElement.classList.add("show");
            this.playWhooshSound();
            // Setup fade out after custom duration unless paused
            toastTimeout = setTimeout(() => {
                notificationElement.classList.add("hide");
                setTimeout(() => {
                    toaster.removeChild(notificationElement);
                    document.head.removeChild(style);
                    if (notificationElement.__styleElement) {
                        notificationElement.__styleElement.remove();
                    }
                }, 300); // remove from DOM after transition ends
            }, remainingTime);
        }, 10); // short delay to ensure the element is in the DOM before applying the "show" class
    
        // Pause the timeout and calculate remaining time
        notificationElement.addEventListener('mouseenter', () => {
            clearTimeout(toastTimeout);
            remainingTime -= Date.now() - startTime;
            notificationElement.classList.add('paused');
        });
    
        // Resume the timeout with the remaining time
        notificationElement.addEventListener('mouseleave', () => {
            startTime = Date.now(); // Reset the start time
            notificationElement.classList.remove('paused');
            notificationElement.classList.remove("hide");
    
            toastTimeout = setTimeout(() => {
                notificationElement.classList.add("hide");
                setTimeout(() => {
                    toaster.removeChild(notificationElement);
                    if (notificationElement.__styleElement) {
                        notificationElement.__styleElement.remove();
                    }
                }, 300);
            }, remainingTime);
        });
    }

    /**
     * Gets elapsed time from a timestamp, and returns a human-readable string.
     * @param {number} initialTimestamp - The timestamp to calculate the elapsed time from.
     * @returns {string} - A human-readable string representing the elapsed time.
     * @example
     * getTimeElapsedString(1595920400); // "1 day ago"
     */
    getTimeElapsedString(initialTimestamp) {
        const now = Date.now(); // Current time in milliseconds
        const past = new Date(initialTimestamp * 1000); // convert your timestamp from seconds to milliseconds if needed
        const secondsDiff = Math.round((now - past) / 1000);
    
        if (secondsDiff < 10) return "Right now";
        if (secondsDiff < 15) return "10 seconds ago";
        if (secondsDiff < 20) return "15 seconds ago";
        if (secondsDiff < 30) return "20 seconds ago";
        if (secondsDiff < 45) return "30 seconds ago";
        if (secondsDiff < 60) return "Less than a minute ago";
        if (secondsDiff < 120) return "A minute ago";
        const minutesDiff = Math.floor(secondsDiff / 60);
        if (minutesDiff < 4) return `A few minutes ago`;
        if (minutesDiff < 60) return `${minutesDiff} minutes ago`;
        const hoursDiff = Math.floor(minutesDiff / 60);
        if (hoursDiff < 2) return "An hour ago";
        if (hoursDiff < 24) return `${hoursDiff} hours ago`;
        if (new Date().toDateString() === new Date(past).toDateString()) return `Today at ${new Date(past).toLocaleTimeString()}`;
        return new Date(past).toLocaleString();
    }

    /**
     * Assemble a toast notification element from the notification object.
     */
    assembleToast(notification) {
        const toastElement = document.createElement("div");
        toastElement.className = `notiphy-notification-element notiphy-toast notiphy-${notification.alertLevel} ${notification.read ? "notiphy-read" : ""}`;
        
        const isButton = notification.actionUrl && notification.linkButton? true : false;
        const linkButton = !isButton? `` : `<div class="notiphy-linkButton-container"><a href="${notification.actionUrl}" class="notiphy-button-link">${!notification.linkButtonLabel ? `Click here` : `${notification.linkButtonLabel}`}</a></div>`;
        
        toastElement.innerHTML = ``
        + `<div class='notiphy-notification-left'>`
        +   `<i class="material-symbols-outlined">notifications_unread</i>`
        + `</div>`
        + `<div class='notiphy-notification-right'>`
        +   `<div class='notiphy-notification-actions'>`
        +       `<i class="notiphy-button-dismiss material-symbols-outlined" title="Dismiss" data-notification-id="${notification.id}">close</i>`
        +   `</div>`
        +   `<div class='notiphy-notification-header'>${notification.title}</div>`
        // +   `<div class='notiphy-notification-body'${notification.actionUrl ? ` onclick="location.href='${notification.actionUrl}';"` : ""}>${notification.text}</div>`
        + `<div class='notiphy-notification-body'${notification.actionUrl && !isButton ? ` style="cursor:pointer;" onclick="location.href='${notification.actionUrl}';"` : ""}>${notification.text}</div>`
        + `${linkButton}`
        +   `<div class='notiphy-notification-footer'>Right now</div>`
        + `</div>`
        + `<div class="progress active"></div>`
        return toastElement;
    }

    /**
     * Assembles a notification element based on the provided notification object.
     * Differs from the Toast element slightly (no progress bar, action buttons, etc.)
     */
    assembleNotification(notification) {
        
        const notificationElement = document.createElement("div");
        notificationElement.className = `notiphy-notification-element${notification.read ? " notiphy-read" : ""}${!notification.alertLevel ? `` : ` notiphy-${notification.alertLevel}`}`;
        
        const isButton = notification.actionUrl && notification.linkButton? true : false;
        const linkButton = !isButton? `` : `<div class="notiphy-linkButton-container"><a href="${notification.actionUrl}" class="notiphy-button-link">${!notification.linkButtonLabel ? `Click here` : `${notification.linkButtonLabel}`}</a></div>`;
        
        notificationElement.innerHTML = ``
        + `<div class='notiphy-notification-left'>`
        + `<i class="material-symbols-outlined">${notification.alertLevel == 'blocker' ? 'crisis_alert' : notification.read ? "notifications" : "notifications_unread"}</i>`
        + `</div>`
        + `<div class='notiphy-notification-right'>`
        + `<div class='notiphy-notification-actions'>`
        + `<i class="notiphy-button-mark-read material-symbols-outlined${notification.read ? " open" : ""}" title="Mark as read" data-notification-id="${notification.id}">${notification.read ? "mark_chat_read" : "mark_chat_unread"}</i>`
        + `<i class="notiphy-button-dismiss material-symbols-outlined" title="Dismiss" data-notification-id="${notification.id}">delete_forever</i>`
        + `</div>`
        + `<div class='notiphy-notification-header'>${notification.title}</div>`
        + `<div class='notiphy-notification-body'${notification.actionUrl && !isButton ? ` style="cursor:pointer;" onclick="location.href='${notification.actionUrl}';" title="Go to ${notification.actionUrl}"` : ""} >${notification.text}</div>`
        + `${linkButton}`
        + `<div class='notiphy-notification-footer'></div>`
        + `</div>`;

        const inbox = document.querySelector(".notiphy-notification-center-body");
    
        // Update the footer after the element is fully created
        this.updateNotificationFooter(notificationElement.querySelector('.notiphy-notification-footer'), notification._ts); // '_ts' is the timestamp of the notification, as indicated by the database.
        return notificationElement;
    }

    // format the time stamp in the notification footer, and update it dynamically.
    updateNotificationFooter(footerElement, initialTimestamp) {
        const updateText = () => {
            const newText = this.getTimeElapsedString(initialTimestamp);
            if (footerElement.textContent !== newText) {
                footerElement.textContent = newText;
            }
        };
    
        // Immediately update text
        updateText();
    
        // Update footer every 5 seconds
        const interval = setInterval(updateText, 5000);
    
        // Clear interval when notification is dismissed
        footerElement.closest('.notiphy-notification-element').querySelector('.notiphy-button-dismiss').addEventListener('click', () => {
            clearInterval(interval);
        });
    }

    /**
     * Adds a new notification to the notification center.
     * @param {Object} notification - The notification object to be added.
     * @returns {void}
     */
    addToNotiphyCenter(notification) {
        const center = document.querySelector(".notiphy-notification-center-body");
        const notificationElement = this.assembleNotification(notification);
        // center.appendChild(notificationElement);
        center.prepend(notificationElement);
        // center.scrollTo({ top: center.scrollHeight, behavior: "smooth" });
        center.scrollTo({ top: 0, behavior: "smooth" });

        // we have added a new notification to the notification center, so we need to update the unread and total counts.
        const unreadCount = document.querySelector(".notiphy-notification-center-stats-unread");
        const totalCount = document.querySelector(".notiphy-notification-center-stats-total");

        if (!notification.read) {
            this.updateUnreadCount(parseInt(unreadCount.textContent) + 1);
            // this.playPopSound();
        }
        totalCount.innerHTML = parseInt(totalCount.innerHTML) + 1;
    }

    /**
     * Fetches notifications from the server and adds them to the Notiphy notification center.
     *
     * This method sends a GET request to the `/fetch-notifications` endpoint, passing the subscriberId 
     * and location ID from the widget's configuration. The response is expected to be a JSON array 
     * of notification objects, which are then added to the Notiphy notification center using the 
     * `addToNotiphyCenter` method.
     *
     * After the notifications have been fetched and added, the `notificationsLoaded` flag is set to `true`.
     *
     * @returns {void}
     */
    async fetchNotifications() {
        const notificationsCenter = document.querySelector('.notiphy-notification-center-body');
        const headers = new Headers({
            'x-api-key': `${this.config.widgetKey}`,
            'x-subscriber-id': `${this.config.subscriberId}`,
            'x-location-id': `${this.config.locationId}`,
        });
    
        const localNotifications = this.loadNotifications();
        const lastFetched = localStorage.getItem('notiphyWidgetLastFetched') || 0;
        
        try {
            const response = await fetch(`${this.config.serviceUrl}/widget/notifications?subscriberId=${this.config.subscriberId}&locationId=${this.config.locationId}&lastFetched=${lastFetched}`, { headers });
            if (!response.ok) {
                // Create an error notification object, and then add it to the notification center
                const notification = {
                    id: 0,
                    title: "Notiphy.me API Key Error",
                    text: "The Notiphy.me API key provided is invalid. Please check your Notiphy.me dashboard for more information.",
                    alertLevel: 'error',
                    read: false,
                    actionUrl: `https://notiphy.me/dashboard/api-keys`,
                    _ts: new Date().getTime()
                };
                this.addToNotiphyCenter(notification);
                this.toggleConnection();
                if (this.config.audioReminder) {
                    this.toggleAudioReminder();
                }
                throw new Error(`Request failed with status: ${response.status}`);
            }
    
            const data = await response.json();
            const fetchedNotifications = data || [];
    
            // Merge with local notifications
            const notificationMap = new Map();
    
            // Add local notifications to the map
            localNotifications.forEach(notification => {
                notificationMap.set(notification.id, notification);
            });
    
            // Update the map with fetched notifications
            fetchedNotifications.forEach(notification => {
                if (notification.dismissed) {
                    // Remove dismissed notifications from local storage
                    notificationMap.delete(notification.id);
                } else {
                    notificationMap.set(notification.id, notification);
                }
            });
    
            // Convert the map back to an array
            this.notifications = Array.from(notificationMap.values());
    
            // Save the merged notifications to session storage
            this.saveNotifications(this.notifications);
    
            // Clear and repopulate the notification center
            notificationsCenter.innerHTML = ``;
            this.updateUnreadCount(0);
            this.updateTotalCount(0);
            this.notifications.forEach(notification => {
                this.addToNotiphyCenter(notification);
            });
    
            if (!this.notificationsLoaded && this.config.showInboxOnLoad) {
                this.toggleNotificationCenter();
            }
            this.notificationsLoaded = true;
    
            // Save the current timestamp as the last fetched time in UTC
            const newLastFetched = Math.floor(Date.now() / 1000); // Unix timestamp in seconds
            localStorage.setItem('notiphyWidgetLastFetched', newLastFetched);
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    }
    
    
    /**
     * Toggles the visibility of the inbox element.
     * If the notifications center is currently hidden, this function will show it.
     * If the notifications center is currently visible, this function will hide it.
     */
    toggleNotificationCenter() {
        const center = document.getElementById("notiphy-notification-center");
        const isOpen = center.classList.contains("open");
        const unreadBadge = document.querySelector('.notiphy-notification-count');
    
        if (isOpen) {
            center.classList.remove("open");
            center.classList.add("close");
            unreadBadge.style.transform = "scale(1)";
            setTimeout(() => {
                center.style.visibility = "hidden"; // Hide after the animation
            }, 300); // Match the transition duration
        } else {
            center.classList.remove("close");
            center.classList.add("open");
            center.style.visibility = "visible"; // Show before the animation
            unreadBadge.style.transform = "scale(0)";
        }
    
        const notificationBody = document.querySelector(".notiphy-notification-center-body");
        notificationBody.scrollTo({ top: 0, behavior: "smooth" });
    }
    /**
     * Marks a notification as read and updates the unread count.
     *
     * @param {string} notificationId - The ID of the notification to mark as read.
     * @param {HTMLElement} targetElement - The DOM element representing the notification.
     * @returns {Promise<void>} - A Promise that resolves when the notification has been marked as read.
     */
    markRead(notificationId, targetElement) {
        targetElement.classList.add("open");
        targetElement.innerHTML = "mark_chat_read";
        const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread");
        let unreadCount = parseInt(unreadCountElement.innerHTML) - 1;
        this.updateUnreadCount(Math.max(0, unreadCount));
        targetElement.closest(".notiphy-notification-element").classList.add("notiphy-read");
    
        // Find the notification's icon and update its innerText
        const iconElement = targetElement.closest(".notiphy-notification-element").querySelector(".notiphy-notification-left i");
        if (iconElement) {
            iconElement.innerText = "notifications";
        }
    
        fetch(`${this.config.serviceUrl}/widget/notification/mark-read`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'x-api-key': `${this.config.widgetKey}`,
                'x-subscriber-id': `${this.config.subscriberId}`,
                'x-location-id': `${this.config.locationId}`,
            },
            body: JSON.stringify({ notificationId, subscriberId: this.config.subscriberId }),
        })
        .then((response) => response.json())
        .then((data) => {
            console.log(data.message);
            // Let other widgets at this location know that a notification has been marked as read
            this.socket.emit("markReadNotification", notificationId);
    
            // Update the local storage
            this.updateLocalNotification(notificationId, { read: true });
        });
    }
    
    markAllRead() {
        const markReadButtons = document.querySelectorAll(".notiphy-button-mark-read");
        Array.from(markReadButtons).forEach((button, index) => {
            setTimeout(() => {
                if (!button.closest(".notiphy-notification-element").classList.contains("notiphy-read")) {
                    this.markRead(button.dataset.notificationId, button);
                    this.playClickOffSound();
                }
            }, index * 110);
        });
    }
    /**
     * Dismisses a notification from the UI and updates the total and unread notification counts.
     *
     * @param {string} notificationId - The ID of the notification to dismiss.
     * @param {HTMLElement} targetElement - The DOM element representing the notification to dismiss.
     * @returns {void}
     */
    dismissNotification(notificationId, targetElement) {
        fetch(`${this.config.serviceUrl}/widget/notification/dismiss`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                'x-api-key': `${this.config.widgetKey}`,
                'x-subscriber-id': `${this.config.subscriberId}`,
                'x-location-id': `${this.config.locationId}`,
            },
            body: JSON.stringify({
                notificationId,
                subscriberId: this.config.subscriberId,
                locationCode: this.config.locationId,
            }),
        })
        .then((response) => response.json())
        .then((data) => {
            console.log(data.message);
    
            // Let other widgets at this location know that a notification has been dismissed
            this.socket.emit("dismissNotification", notificationId);
    
            // Update the total count
            const totalCountElement = document.querySelector(".notiphy-notification-center-stats-total");
            let totalCount = parseInt(totalCountElement.textContent) - 1;
            this.updateTotalCount(Math.max(0, totalCount));
    
            // Update the unread count if the dismissed notification was unread
            if (!targetElement.parentNode.parentNode.parentNode.classList.contains("notiphy-read")) {
                const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread");
                let unreadCount = parseInt(unreadCountElement.textContent) - 1;
                this.updateUnreadCount(Math.max(0, unreadCount));
            }
    
            if (targetElement.parentNode.parentNode.parentNode) {
                targetElement.parentNode.parentNode.parentNode.remove();
            }
    
            // Remove the notification from local storage
            this.removeLocalNotification(notificationId);
        });
    }

    /**
     * Reuses dismissNotification() to dismiss all notifications.
     */
    dismissAllNotifications() {
        const dismissButtons = document.querySelectorAll(".notiphy-button-dismiss");
        Array.from(dismissButtons).forEach((button, index) => {
            setTimeout(() => {
                const notificationId = button.dataset.notificationId;
                this.dismissNotification(notificationId, button);
            }, index * 50); // short delay between each iteration
        });
            this.playCrumpleSound();
    }

    updateLocalNotification(notificationId, updates) {
        const notifications = this.loadNotifications();
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        if (notificationIndex !== -1) {
            notifications[notificationIndex] = { ...notifications[notificationIndex], ...updates };
            this.saveNotifications(notifications);
        }
    }
    
    removeLocalNotification(notificationId) {
        let notifications = this.loadNotifications();
        notifications = notifications.filter(n => n.id !== notificationId);
        this.saveNotifications(notifications);
    }

    /**
     * Toggles all sounds on or off.
     *
     * If off, all notifications are delivered quietly. Reminders, if enabled, will be delivered quietly.
     */
    toggleAudioAlert() {
        this.config.audioAlert = !this.config.audioAlert;
        const button = document.querySelector(".notiphy-button-audio-alert");
        button.classList.toggle("notiphy-enabled");
        button.title = this.config.audioAlert ? "Sound on" : "Sound off";
        button.innerHTML = this.config.audioAlert ? "volume_up" : "volume_off";
        this.config.audioAlert ? this.playClickOnSound() : this.playClickOffSound();
        console.log("Sound", this.config.audioAlert ? "on" : "off");
        this.saveSettings(); // Save settings after change
    }

    /**
     * Toggles audible Reminders for unread messages
     */
    toggleAudioReminder() {
        this.config.audioReminder = !this.config.audioReminder;
        const button = document.querySelector(".notiphy-button-audio-reminder");
        button.classList.toggle("notiphy-enabled");
        button.title = this.config.audioReminder ? "Reminders on" : "Reminders off";
        button.innerHTML = this.config.audioReminder ? "alarm_on" : "alarm_off";
        if (this.config.audioReminder) {
            this.setupAudioReminders();
            this.playClickOnSound();
        } else {
            clearInterval(this.reminderIntervalId);
            this.reminderIntervalId = null;
            this.playClickOffSound();
        }
        this.saveSettings(); // Save settings after change
    }
    
    /**
     * Toggles toast notifications on or off. If off, notifications will not be displayed as toasts and appear only in the inbox.
     */
    toggleToastAlert() {
        this.config.toastAlert = !this.config.toastAlert;
        const button = document.querySelector(".notiphy-button-show-toasts");
        button.classList.toggle("notiphy-enabled");
        this.config.toastAlert ? this.playClickOnSound() : this.playClickOffSound();
        console.log("Toasts", this.config.toastAlert ? "on" : "off");
        this.saveSettings(); // Save settings after change
    }

    /**
     * Toggles the position of toast notifications.
     */
    changeToastPosition() {
        const positions = ['top-left', 'top-center', 'top-right', 'bottom-right', 'bottom-center', 'bottom-left'];
        const currentIndex = positions.indexOf(this.config.toastPosition);
        this.config.toastPosition = positions[(currentIndex + 1) % positions.length];
        document.querySelector('.notiphy-toaster').className = `notiphy-toaster ${this.config.toastPosition}`;
        this.playClickOnSound();
        console.log("Toast Position", this.config.toastPosition);
        this.saveSettings(); // Save settings after change
        this.updateSettingsDropdown();
    }

    /**
     * Toggles display modes (dark/light/auto)
     */
    changeDisplayMode() {
        const currentTheme = localStorage.getItem('notiphy-theme') || themes.LIGHT;
        let newTheme;
        switch (currentTheme) {
            case themes.LIGHT:
                newTheme = themes.DARK;
                break;
            case themes.DARK:
                newTheme = themes.AUTO;
                break;
            case themes.AUTO:
                newTheme = themes.LIGHT;
                break;
            default:
                newTheme = themes.LIGHT;
        }
        setTheme(newTheme);
        this.playClickOnSound();
        this.updateSettingsDropdown();
    }

    /**
     * Sounds.
     */

    // plays tone on connection
    playStartSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(start);
        audio.play();
    }

    // plays when notification is added to inbox
    playPopSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(pop);
        audio.play();
    }

    // ding, plays right before audio reminder
    playDingSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(ding);
        audio.play();
    }

    // the blocker tone
    playPingSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(ping);
        audio.play();
    }

    // plays when a toast is shown
    playWhooshSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(whoosh);
        audio.play();
    }

    // click (on)
    playClickOnSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(clickOn);
        audio.play();
    }

    // click (off)
    playClickOffSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(clickOff);
        audio.play();
    }

    // dismiss/trash
    playDismissSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(dismiss);
        audio.play();
    }

    // dismiss all
    playCrumpleSound() {
        if (!this.config.audioAlert) {
            return;
        }
        const audio = new Audio(crumple);
        audio.play();
    }
    /**
     * Sound on: "Attention: Notifications waiting."
     * Sound off: "Zzzzzzz Zzzzzzzz" (phone silent mode)
     * Unread = 0: do nothing
     * Reminders off: do nothing
     */
    playReminderSound() {
        const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread");
        let unreadCount = parseInt(unreadCountElement.textContent);
        unreadCount = Math.max(0, unreadCount);
        if (unreadCount == 0){
            return;
        }
        if (!this.config.audioReminder) {
            return;
        }
        if (this.config.audioAlert) {
            const dingAudio = new Audio(ding);
            const audio = new Audio(notifications_waiting);
            dingAudio.play();
            setTimeout(() => {
                audio.play();
            }, 750);
        } else {
            // Reminders are on, but sound is off. Play a silent reminder.
            const audio = new Audio(phoneVibrate);
            audio.play();
            setTimeout(() => {
                audio.play();
            }, 750);
        }
        
    }

    /**
     * Updates the connection status display in the notification center.
     *
     * @param {string} status - The current connection status to display.
     */
    updateConnectionStatus(status) {
        const connectionStatus = document.querySelector(".notiphy-notification-center-connection");
        connectionStatus.textContent = status;

        const statusIndicator = document.querySelector(".notiphy-notification-center-connect-status");
        statusIndicator.title = status;
        statusIndicator.classList.toggle("connected");
    }

    /**
     * Toggles the connection state of the widget.  Connects or disconnects the socket.io connection.
     */
    toggleConnection() {
        if (this.socket.connected) {
            this.socket.disconnect();
            this.playClickOffSound();
        } else {
            this.socket.connect();
            this.playClickOnSound();
            this.playStartSound();
        }
    }

    /**
     * Updates the unread notification count displayed in the widget icon.
     *
     * @param {number} count - The new unread notification count.
     */
    updateUnreadCount(count) {
        const unreadCountElement = document.querySelector(".notiphy-notification-center-stats-unread"); //inbox
        unreadCountElement.textContent = count;                                                         // set inbox count

        const notificationIcon = document.querySelector(".notiphy-icon");                               // get icon
        const notificationCount = document.querySelector(".notiphy-notification-count");                // get icon count
        notificationCount.textContent = count;                                                          // set icon count

        count > 0 ? notificationCount.style.display = "flex" : notificationCount.style.display = "none";
        count > 0 ? unreadCountElement.style.background = "" : unreadCountElement.style.background = "#999";
        count > 0 ? notificationIcon.classList.add("notiphy-icon-unread") : notificationIcon.classList.remove("notiphy-icon-unread");
        count > 0 ? notificationIcon.firstChild.textContent = "notifications_active" : notificationIcon.firstChild.textContent = "notifications";
    }

    /**
     * Updates the total count of notifications.
     *
     * @param {number} count - The new total count of notifications.
     */
    updateTotalCount(count) {
        const totalCountElement = document.querySelector('.notiphy-notification-center-stats-total');
        totalCountElement.textContent = count;
    }
}

const themes = {
    LIGHT: 'light',
    DARK: 'dark',
    AUTO: 'auto'
};
function setTheme(theme) {
    // console.log("Setting theme to " + theme);
    let appliedTheme = theme;
    if (theme === themes.AUTO) {
        const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
        appliedTheme = prefersDarkScheme ? themes.DARK : themes.LIGHT;
    }

    document.documentElement.setAttribute('data-theme', appliedTheme);
    localStorage.setItem('notiphy-theme', theme);

    
}


function initializeTheme() {
    const savedTheme = localStorage.getItem('notiphy-theme') || themes.LIGHT;
    // console.log("Initializing theme:", savedTheme);
    setTheme(savedTheme);
}