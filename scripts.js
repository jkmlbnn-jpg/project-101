
/* ==================================================
   EQUIPTRACK - MAIN JAVASCRIPT
================================================== */


/* ==============================
   GENERAL HELPER FUNCTIONS
============================== */

// Format names into Title Case
function formatName(name) {
    return (name || "")
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, function(letter) {
            return letter.toUpperCase();
        });
}

// Get saved data from localStorage
function getSavedData(key, fallback = []) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch (error) {
        console.error("Error reading " + key + ":", error);
        return fallback;
    }
}

// Save data to localStorage
function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Get the currently logged-in user
function getCurrentUser() {
    return getSavedData("equipTrackCurrentUser", null);
}

// Get all borrowing requests
function getRequests() {
    return getSavedData("equipTrackRequests", []);
}


/* ==============================
   FORMAT EXISTING ACCOUNT NAMES
============================== */

const savedUsers = getSavedData("equipTrackUsers");

savedUsers.forEach(function(user) {
    user.name = formatName(user.name);
});

saveData("equipTrackUsers", savedUsers);

const currentUserData = getCurrentUser();

if (currentUserData) {
    currentUserData.name = formatName(currentUserData.name);
    saveData("equipTrackCurrentUser", currentUserData);
}

const savedRequests = getRequests();

savedRequests.forEach(function(request) {
    request.fullName = formatName(request.fullName);
    request.approvedBy = formatName(request.approvedBy);
});

saveData("equipTrackRequests", savedRequests);


/* ==============================
   SHARED EQUIPMENT AVAILABILITY
============================== */

const defaultEquipment = {
    "Laptop": 10,
    "Projector": 5,
    "Desktop Computer": 15,
    "Monitor": 8
};

function getEquipmentData() {
    let equipmentData = getSavedData("equipTrackEquipment", null);

    if (!equipmentData) {
        equipmentData = { ...defaultEquipment };
        saveData("equipTrackEquipment", equipmentData);
    }

    return equipmentData;
}

function saveEquipmentData(equipmentData) {
    saveData("equipTrackEquipment", equipmentData);
}

function displayEquipmentAvailability() {
    const equipmentData = getEquipmentData();

    document.querySelectorAll(".equipment-card").forEach(function(card) {
        const nameElement = card.querySelector("h3");
        const availabilityElement = card.querySelector(".equipment-availability");

        if (!nameElement || !availabilityElement) return;

        const equipmentName = nameElement.textContent.trim();

        if (Object.prototype.hasOwnProperty.call(equipmentData, equipmentName)) {
            availabilityElement.textContent = equipmentData[equipmentName];
        }
    });
}

// Display equipment quantities when the page loads
displayEquipmentAvailability();


/* ==============================
   PROTECT EQUIPTRACK PAGES
============================== */

function checkLoginAccess() {
    const protectedPages = [
        "home.html",
        "equipment.html",
        "borrowings.html",
        "history.html",
        "notifications.html",
        "staff.html",
        "requests.html",
        "staff_equipment.html",
        "staff_history.html"
    ];

    const currentPage = window.location.pathname.split("/").pop();

    if (!protectedPages.includes(currentPage)) return;

    if (!getCurrentUser()) {
        const loginPage = window.location.pathname.includes("/staff_dashboard/")
            ? "../index.html"
            : "index.html";

        window.location.replace(loginPage);
    }
}

checkLoginAccess();

window.addEventListener("pageshow", checkLoginAccess);


/* ==============================
   ACCOUNT TYPE BUTTONS
============================== */

const roleButtons = document.querySelectorAll(".role-btn");
const signupRole = document.getElementById("signupRole");

if (roleButtons.length && signupRole) {
    roleButtons.forEach(function(button) {
        button.addEventListener("click", function(event) {
            event.preventDefault();

            roleButtons.forEach(function(roleButton) {
                roleButton.classList.remove("active");
            });

            button.classList.add("active");
            signupRole.value = button.dataset.role;
        });
    });
}


/* ==============================
   SIGN UP
============================== */

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const name = formatName(document.getElementById("name").value);
        const email = document.getElementById("signupEmail").value.trim().toLowerCase();
        const password = document.getElementById("signupPassword").value;
        const role = signupRole.value;

        // Prevent student emails from registering as staff/admin
        if (role === "staff" && email.endsWith("@g.batstate-u.edu.ph")) {
            alert("Registration Notice: A student email cannot be used to register as an Administrator. Please select Student as your account type.");
            return;
        }

        // Require official student email for student accounts
        if (role === "student" && !email.endsWith("@g.batstate-u.edu.ph")) {
            alert("Registration failed! Students must use their official BatStateU student email (@g.batstate-u.edu.ph).");
            return;
        }

        const users = getSavedData("equipTrackUsers");

        const existingUser = users.find(function(user) {
            return user.email.toLowerCase() === email;
        });

        if (existingUser) {
            alert("This email is already registered.");
            return;
        }

        users.push({
            name: name,
            email: email,
            password: password,
            role: role
        });

        saveData("equipTrackUsers", users);

        alert("Account created successfully!");

        signupForm.reset();
        window.location.href = "index.html";
    });
}


/* ==============================
   LOGIN
============================== */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (!email || !password) {
            alert("Please complete all fields.");
            return;
        }

        const users = getSavedData("equipTrackUsers");

        const matchedUser = users.find(function(user) {
            return user.email.toLowerCase() === email &&
                user.password === password;
        });

        if (!matchedUser) {
            alert("Incorrect email or password. Please try again.");
            return;
        }

        saveData("equipTrackCurrentUser", {
            name: matchedUser.name,
            email: matchedUser.email,
            role: matchedUser.role
        });

        alert("Login successful! Welcome, " + matchedUser.name + "!");

        window.location.href = matchedUser.role === "staff"
            ? "staff_dashboard/staff.html"
            : "home.html";
    });
}


/* ==============================
   LOGOUT FUNCTION
============================== */

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");
const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");

if (logoutBtn && logoutModal) {
    logoutBtn.addEventListener("click", function() {
        logoutModal.hidden = false;
    });
}

if (confirmLogout) {
    confirmLogout.addEventListener("click", function() {
        localStorage.removeItem("equipTrackCurrentUser");

        const loginPage = window.location.pathname.includes("/staff_dashboard/")
            ? "../index.html"
            : "index.html";

        window.location.replace(loginPage);
    });
}

if (cancelLogout && logoutModal) {
    cancelLogout.addEventListener("click", function() {
        logoutModal.hidden = true;
    });
}


/* ==============================
   BORROWING REQUEST FUNCTION
============================== */

const borrowButtons = document.querySelectorAll(".borrow-btn");
const borrowModal = document.getElementById("borrowModal");
const borrowForm = document.getElementById("borrowForm");

const selectedEquipment = document.getElementById("selectedEquipment");
const cancelBorrow = document.getElementById("cancelBorrow");

const borrowDateInput = document.getElementById("borrowDate");
const returnDateInput = document.getElementById("returnDate");

const borrowerBlock = document.getElementById("borrowerBlock");
const borrowPurpose = document.getElementById("borrowPurpose");

let currentEquipment = null;


// Get today's date in local time
function getTodayDate() {
    const today = new Date();
    today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

    return today.toISOString().split("T")[0];
}

// Calculate the latest allowed return date
function getMaxReturnDate(startDate) {
    const maxDate = new Date(startDate + "T00:00:00");
    maxDate.setDate(maxDate.getDate() + 7);

    const year = maxDate.getFullYear();
    const month = String(maxDate.getMonth() + 1).padStart(2, "0");
    const day = String(maxDate.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;
}

// Update return date limits
function updateReturnDateLimit() {
    if (!borrowDateInput || !returnDateInput || !borrowDateInput.value) return;

    const selectedBorrowDate = borrowDateInput.value;
    const maximumDate = getMaxReturnDate(selectedBorrowDate);

    returnDateInput.min = selectedBorrowDate;
    returnDateInput.max = maximumDate;

    if (
        !returnDateInput.value ||
        returnDateInput.value < selectedBorrowDate ||
        returnDateInput.value > maximumDate
    ) {
        returnDateInput.value = selectedBorrowDate;
    }
}

// Reset borrowing dates
function resetBorrowingDates() {
    if (!borrowDateInput || !returnDateInput) return;

    const todayDate = getTodayDate();

    borrowDateInput.min = todayDate;
    borrowDateInput.value = todayDate;

    returnDateInput.min = todayDate;
    returnDateInput.value = todayDate;
    returnDateInput.max = getMaxReturnDate(todayDate);
}

if (borrowDateInput && returnDateInput) {
    resetBorrowingDates();

    borrowDateInput.addEventListener("change", updateReturnDateLimit);
}


// Open borrowing popup
if (borrowModal && borrowForm && selectedEquipment) {
    borrowButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            const card = button.closest(".equipment-card");

            if (!card) {
                console.error("Equipment card not found.");
                return;
            }

            const nameElement = card.querySelector("h3");
            const infoParagraphs = card.querySelectorAll(".equipment-info p");

            if (!nameElement || infoParagraphs.length < 2) {
                console.error("Equipment details are missing.");
                return;
            }

            const equipmentName = nameElement.textContent.trim();
            const equipmentColor = infoParagraphs[0].textContent.trim();

            const equipmentData = getEquipmentData();
            const availableQuantity = equipmentData[equipmentName] ?? 0;

            if (availableQuantity <= 0) {
                alert("Sorry, no " + equipmentName + " units are currently available.");
                return;
            }

            currentEquipment = {
                name: equipmentName,
                color: equipmentColor,
                availability: "Available: " + availableQuantity
            };

            selectedEquipment.textContent =
                equipmentName + " | " + equipmentColor +
                " | Available: " + availableQuantity;

            resetBorrowingDates();
            borrowModal.hidden = false;
        });
    });

    // Close borrowing popup
    if (cancelBorrow) {
        cancelBorrow.addEventListener("click", function() {
            borrowModal.hidden = true;
            currentEquipment = null;
        });
    }

    // Submit borrowing request
    borrowForm.addEventListener("submit", function(event) {
        event.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please log in before borrowing equipment.");
            window.location.href = "index.html";
            return;
        }

        if (!currentEquipment) {
            alert("Please select equipment first.");
            return;
        }

        if (!borrowDateInput || !returnDateInput || !borrowerBlock) {
            alert("Some borrowing form fields are missing.");
            return;
        }

        const borrowDate = borrowDateInput.value;
        const returnDate = returnDateInput.value;

        if (!borrowDate || !returnDate) {
            alert("Please select both borrowing dates.");
            return;
        }

        const startDate = new Date(borrowDate + "T00:00:00");
        const endDate = new Date(returnDate + "T00:00:00");

        const daysBorrowed = Math.round(
            (endDate - startDate) / (1000 * 60 * 60 * 24)
        );

        if (daysBorrowed < 0) {
            alert("Return date cannot be earlier than borrow date.");
            return;
        }

        if (daysBorrowed > 7 || returnDate > getMaxReturnDate(borrowDate)) {
            alert("Borrowing period cannot exceed 7 days.");
            return;
        }

        const newRequest = {
            id: Date.now(),
            equipment: currentEquipment.name,
            color: currentEquipment.color,
            availability: currentEquipment.availability,
            fullName: currentUser.name,
            email: currentUser.email,
            block: borrowerBlock.value.trim(),
            borrowDate: borrowDate,
            returnDate: returnDate,
            purpose: borrowPurpose ? borrowPurpose.value.trim() : "",
            status: "Pending"
        };

        const requests = getRequests();
        requests.push(newRequest);
        saveData("equipTrackRequests", requests);

        alert("Your borrowing request has been submitted!");

        borrowForm.reset();
        resetBorrowingDates();

        borrowModal.hidden = true;
        currentEquipment = null;
    });

} else if (borrowButtons.length > 0) {
    console.error("Borrowing modal, form, or selected equipment element is missing.");
}


/* ==============================
   MY BORROWINGS PAGE
============================== */

const borrowingsList = document.getElementById("borrowingsList");
const emptyBorrowings = document.getElementById("emptyBorrowings");

if (borrowingsList && emptyBorrowings) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        alert("Please log in first.");
        window.location.href = "index.html";
    } else {
        const studentRequests = getRequests().filter(function(request) {
            return request.email &&
                request.email.toLowerCase() === currentUser.email.toLowerCase() &&
                (request.status || "Pending") === "Pending";
        });

        borrowingsList.innerHTML = "";
        emptyBorrowings.hidden = studentRequests.length > 0;

        studentRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "borrowing-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment;
            card.appendChild(heading);

            const details = [
                ["Color", (request.color || "").replace("Color: ", "")],
                ["Full Name", request.fullName],
                ["Email", request.email],
                ["Block / Section", request.block],
                ["Borrow Date", request.borrowDate],
                ["Return Date", request.returnDate],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent = detail[0] + ": " + detail[1];
                card.appendChild(paragraph);
            });

            const status = document.createElement("span");
            status.className = "borrowing-status status-pending";
            status.textContent = "Pending";

            card.appendChild(status);
            borrowingsList.appendChild(card);
        });
    }
}


/* ==============================
   STUDENT BORROWING HISTORY
============================== */

const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");

if (historyList && emptyHistory) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.href = "index.html";
    } else {
        const historyRequests = getRequests().filter(function(request) {
            return request.email &&
                request.email.toLowerCase() === currentUser.email.toLowerCase() &&
                (request.status === "Approved" || request.status === "Declined");
        });

        historyList.innerHTML = "";
        emptyHistory.hidden = historyRequests.length > 0;

        historyRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "history-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment;
            card.appendChild(heading);

            const details = [
                ["Color", (request.color || "").replace("Color: ", "")],
                ["Full Name", request.fullName],
                ["Block / Section", request.block],
                ["Borrow Date", request.borrowDate],
                ["Return Date", request.returnDate],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent = detail[0] + ": " + detail[1];
                card.appendChild(paragraph);
            });

            const status = document.createElement("span");
            status.className = "history-status";
            status.textContent = request.status;
            status.classList.add(
                request.status === "Approved" ? "status-approved" : "status-declined"
            );

            card.appendChild(status);
            historyList.appendChild(card);
        });
    }
}


/* ==============================
   STAFF DASHBOARD SUMMARY
============================== */

const totalRequestsElement = document.getElementById("totalRequests");
const pendingRequestsElement = document.getElementById("pendingRequests");
const approvedRequestsElement = document.getElementById("approvedRequests");
const declinedRequestsElement = document.getElementById("declinedRequests");

if (totalRequestsElement) {
    const requests = getRequests();

    const pendingCount = requests.filter(function(request) {
        return request.status === "Pending" || !request.status;
    }).length;

    const approvedCount = requests.filter(function(request) {
        return request.status === "Approved";
    }).length;

    const declinedCount = requests.filter(function(request) {
        return request.status === "Declined";
    }).length;

    totalRequestsElement.textContent = requests.length;

    if (pendingRequestsElement) pendingRequestsElement.textContent = pendingCount;
    if (approvedRequestsElement) approvedRequestsElement.textContent = approvedCount;
    if (declinedRequestsElement) declinedRequestsElement.textContent = declinedCount;
}


/* ==============================
   STAFF BORROWING REQUESTS PAGE
============================== */

const staffRequestsList = document.getElementById("staffRequestsList");
const emptyStaffRequests = document.getElementById("emptyStaffRequests");

if (staffRequestsList && emptyStaffRequests) {
    const pendingRequests = getRequests().filter(function(request) {
        return !request.status || request.status === "Pending";
    });

    staffRequestsList.innerHTML = "";
    emptyStaffRequests.hidden = pendingRequests.length > 0;

    pendingRequests.forEach(function(request) {
        const card = document.createElement("div");
        card.className = "borrowing-card";

        const heading = document.createElement("h3");
        heading.textContent = request.equipment;
        card.appendChild(heading);

        const details = [
            ["Student Name", request.fullName],
            ["Email", request.email],
            ["Color", (request.color || "").replace("Color: ", "")],
            ["Block / Section", request.block],
            ["Borrow Date", request.borrowDate],
            ["Return Date", request.returnDate],
            ["Purpose", request.purpose || "Not specified"]
        ];

        details.forEach(function(detail) {
            const paragraph = document.createElement("p");
            paragraph.textContent = detail[0] + ": " + (detail[1] || "Not specified");
            card.appendChild(paragraph);
        });

        const status = document.createElement("span");
        status.className = "borrowing-status status-pending";
        status.textContent = "Pending";
        card.appendChild(status);

        const buttonContainer = document.createElement("div");
        buttonContainer.className = "request-actions";

        const approveButton = document.createElement("button");
        approveButton.textContent = "Approve";
        approveButton.className = "approve-btn";

        const declineButton = document.createElement("button");
        declineButton.textContent = "Decline";
        declineButton.className = "decline-btn";

        approveButton.addEventListener("click", function() {
            updateRequestStatus(request.id, "Approved");
        });

        declineButton.addEventListener("click", function() {
            updateRequestStatus(request.id, "Declined");
        });

        buttonContainer.appendChild(approveButton);
        buttonContainer.appendChild(declineButton);
        card.appendChild(buttonContainer);

        staffRequestsList.appendChild(card);
    });
}


/* ==============================
   UPDATE BORROWING REQUEST STATUS
============================== */

function updateRequestStatus(requestId, newStatus) {
    const requests = getRequests();

    const request = requests.find(function(item) {
        return item.id === requestId;
    });

    if (!request) return;

    if (request.status && request.status !== "Pending") {
        alert("This request has already been processed.");
        return;
    }

    const currentUser = getCurrentUser();

    if (!currentUser || currentUser.role !== "staff") {
        alert("Only staff accounts can process requests.");
        return;
    }

    if (newStatus !== "Approved" && newStatus !== "Declined") {
        alert("Invalid request status.");
        return;
    }

    if (newStatus === "Approved") {
        const equipmentData = getEquipmentData();
        const equipmentName = request.equipment;

        if (!Object.prototype.hasOwnProperty.call(equipmentData, equipmentName)) {
            alert("Equipment not found in the equipment list.");
            return;
        }

        const availableQuantity = Number(equipmentData[equipmentName]);

        if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) {
            alert("Cannot approve this request. No " + equipmentName + " units are available.");
            return;
        }

        equipmentData[equipmentName] = availableQuantity - 1;
        saveEquipmentData(equipmentData);

        request.approvedBy = currentUser.name;
    }

    request.status = newStatus;
    saveData("equipTrackRequests", requests);


    // Create student notification
    const notifications = getSavedData("equipTrackNotifications");

    const existingNotification = notifications.find(function(notification) {
        return notification.requestId === request.id;
    });

    if (!existingNotification) {
        notifications.unshift({
            id: Date.now(),
            requestId: request.id,
            email: request.email,
            equipment: request.equipment,
            status: newStatus,
            message: newStatus === "Approved"
                ? "Your request to borrow " + request.equipment + " has been approved."
                : "Your request to borrow " + request.equipment + " has been declined.",
            date: new Date().toLocaleString(),
            read: false
        });

        saveData("equipTrackNotifications", notifications);
    }

    alert("Request successfully " + newStatus.toLowerCase() + "!");

    window.location.reload();
}


/* ==============================
   STAFF EQUIPMENT MANAGEMENT
============================== */

(function() {
    const staffEquipmentList = document.getElementById("staffEquipmentList");

    if (!staffEquipmentList) return;

    function displayAvailability() {
        const equipmentData = getEquipmentData();

        staffEquipmentList.querySelectorAll(".equipment-card").forEach(function(card) {
            const button = card.querySelector(".edit-equipment-btn");
            const availability = card.querySelector(".equipment-availability");

            if (!button || !availability) return;

            availability.textContent = equipmentData[button.dataset.name] ?? 0;
        });
    }

    displayAvailability();

    staffEquipmentList.querySelectorAll(".edit-equipment-btn").forEach(function(button) {
        button.addEventListener("click", function() {
            const equipmentName = button.dataset.name;
            const equipmentData = getEquipmentData();
            const currentQuantity = equipmentData[equipmentName] ?? 0;

            const newQuantity = prompt(
                "Enter the new available quantity for " + equipmentName + ":",
                currentQuantity
            );

            if (newQuantity === null) return;

            const quantity = newQuantity.trim();

            if (quantity === "" || !/^\d+$/.test(quantity)) {
                alert("Please enter a valid whole number.");
                return;
            }

            equipmentData[equipmentName] = Number(quantity);
            saveEquipmentData(equipmentData);

            displayAvailability();

            alert(equipmentName + " availability updated successfully!");
        });
    });

})();


/* ==============================
   STAFF BORROWING HISTORY
============================== */

(function() {
    const historyList = document.getElementById("staffHistoryList");
    const emptyHistory = document.getElementById("emptyStaffHistory");

    if (!historyList || !emptyHistory) return;

    const historyRequests = getRequests().filter(function(request) {
        return request.status === "Approved" || request.status === "Declined";
    });

    historyList.innerHTML = "";
    emptyHistory.hidden = historyRequests.length > 0;

    historyRequests.forEach(function(request) {
        const card = document.createElement("div");
        card.className = "borrowing-card";

        const heading = document.createElement("h3");
        heading.textContent = request.equipment || "Equipment";
        card.appendChild(heading);

        const details = [
            ["Student Name", request.fullName],
            ["Email", request.email],
            ["Block / Section", request.block],
            ["Borrow Date", request.borrowDate],
            ["Return Date", request.returnDate],
            ["Purpose", request.purpose || "Not specified"],
            ["Approved By", request.status === "Approved"
                ? (request.approvedBy || "Not recorded")
                : "N/A"]
        ];

        details.forEach(function(detail) {
            const paragraph = document.createElement("p");
            paragraph.textContent = detail[0] + ": " + (detail[1] || "Not provided");
            card.appendChild(paragraph);
        });

        const status = document.createElement("p");
        status.textContent = "Status: " + request.status;
        status.className = request.status === "Approved"
            ? "status-approved"
            : "status-declined";

        card.appendChild(status);
        historyList.appendChild(card);
    });

})();


/* ==============================
   STUDENT NOTIFICATIONS
============================== */

function displayNotifications() {
    const notificationsList = document.getElementById("notificationsList");

    if (!notificationsList) return;

    const currentUser = getCurrentUser();

    if (!currentUser) return;

    const notifications = getSavedData("equipTrackNotifications");

    const studentNotifications = notifications.filter(function(notification) {
        return notification.email &&
            notification.email.toLowerCase() === currentUser.email.toLowerCase();
    });

    const activeFilter = document.querySelector(".notification-filter.active");
    const filter = activeFilter ? activeFilter.dataset.filter : "all";

    let filteredNotifications = studentNotifications;

    if (filter === "unread") {
        filteredNotifications = studentNotifications.filter(function(notification) {
            return !notification.read;
        });
    } else if (filter === "Approved" || filter === "Declined") {
        filteredNotifications = studentNotifications.filter(function(notification) {
            return notification.status === filter;
        });
    }

    notificationsList.innerHTML = "";

    if (filteredNotifications.length === 0) {
        notificationsList.innerHTML = "<p>No notifications found.</p>";
        updateNotificationCount();
        return;
    }

    filteredNotifications.forEach(function(notification) {
        const card = document.createElement("div");
        card.className = "notification-card";

        if (!notification.read) {
            card.classList.add("unread");
        }

        const heading = document.createElement("h3");
        heading.textContent = notification.status === "Approved"
            ? "Borrowing Request Approved"
            : "Borrowing Request Declined";

        const message = document.createElement("p");
        message.textContent = notification.message;

        const date = document.createElement("small");
        date.textContent = notification.date;

        const status = document.createElement("span");
        status.className = "notification-status";
        status.textContent = notification.status;

        status.classList.add(
            notification.status === "Approved"
                ? "status-approved"
                : "status-declined"
        );

        const readButton = document.createElement("button");
        readButton.type = "button";
        readButton.textContent = notification.read ? "Read" : "Mark as Read";
        readButton.disabled = notification.read;

        readButton.addEventListener("click", function() {
            markNotificationAsRead(notification.id);
        });

        card.appendChild(heading);
        card.appendChild(status);
        card.appendChild(message);
        card.appendChild(date);
        card.appendChild(readButton);

        notificationsList.appendChild(card);
    });

    updateNotificationCount();
}


/* ==============================
   UPDATE NOTIFICATION COUNT
============================== */

function updateNotificationCount() {
    const countElement = document.getElementById("notificationCount");

    if (!countElement) return;

    const currentUser = getCurrentUser();

    if (!currentUser) return;

    const notifications = getSavedData("equipTrackNotifications");

    const unreadCount = notifications.filter(function(notification) {
        return notification.email &&
            notification.email.toLowerCase() === currentUser.email.toLowerCase() &&
            !notification.read;
    }).length;

    countElement.textContent = unreadCount;
    countElement.hidden = unreadCount === 0;
}


/* ==============================
   MARK ONE NOTIFICATION AS READ
============================== */

function markNotificationAsRead(notificationId) {
    const notifications = getSavedData("equipTrackNotifications");

    const notification = notifications.find(function(item) {
        return item.id === notificationId;
    });

    if (!notification) return;

    notification.read = true;
    saveData("equipTrackNotifications", notifications);

    displayNotifications();
}


/* ==============================
   MARK ALL NOTIFICATIONS AS READ
============================== */

function markAllNotificationsAsRead() {
    const currentUser = getCurrentUser();

    if (!currentUser) return;

    const notifications = getSavedData("equipTrackNotifications");

    notifications.forEach(function(notification) {
        if (
            notification.email &&
            notification.email.toLowerCase() === currentUser.email.toLowerCase()
        ) {
            notification.read = true;
        }
    });

    saveData("equipTrackNotifications", notifications);
    displayNotifications();
}


// ==============================
// CLEAR ALL NOTIFICATIONS
// ==============================

function clearAllNotifications() {
    const currentUser = getCurrentUser();

    if (!currentUser) return;

    if (!confirm("Mark all notifications as read?")) {
        return;
    }

    const notifications = getSavedData("equipTrackNotifications");

    notifications.forEach(function(notification) {
        if (
            notification.email &&
            notification.email.toLowerCase() === currentUser.email.toLowerCase()
        ) {
            notification.read = true;
        }
    });

    saveData("equipTrackNotifications", notifications);

    displayNotifications();
    updateNotificationCount();
}

/* ==============================
   NOTIFICATION PAGE BUTTONS
============================== */

document.querySelectorAll(".notification-filter").forEach(function(button) {
    button.addEventListener("click", function() {
        document.querySelectorAll(".notification-filter").forEach(function(filterButton) {
            filterButton.classList.remove("active");
        });

        button.classList.add("active");
        displayNotifications();
    });
});

const markAllReadBtn = document.getElementById("markAllReadBtn");

if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", markAllNotificationsAsRead);
}

const clearNotificationsBtn = document.getElementById("clearNotificationsBtn");

if (clearNotificationsBtn) {
    clearNotificationsBtn.addEventListener("click", clearAllNotifications);
}


/* ==============================
   PERSONALIZED DASHBOARD GREETING
============================== */

function displayDashboardGreeting() {
    const greeting = document.getElementById("dashboardGreeting");
    const roleLabel = document.getElementById("dashboardRole");

    if (!greeting || !roleLabel) return;

    const currentUser = getCurrentUser();

    if (!currentUser) return;

    greeting.textContent = "Hello, " + formatName(currentUser.name) + "!";

    roleLabel.textContent = currentUser.role === "staff"
        ? "Staff Portal"
        : "Student Portal";
}


/* ==============================
   INITIALIZE PAGE FEATURES
============================== */

displayNotifications();
updateNotificationCount();
displayDashboardGreeting();


/* ==============================
   SYNCHRONIZE DATA BETWEEN TABS
============================== */

window.addEventListener("storage", function(event) {
    if (event.key === "equipTrackEquipment") {
        displayEquipmentAvailability();

        const staffEquipmentList = document.getElementById("staffEquipmentList");

        if (staffEquipmentList) {
            staffEquipmentList.querySelectorAll(".equipment-card").forEach(function(card) {
                const button = card.querySelector(".edit-equipment-btn");
                const availability = card.querySelector(".equipment-availability");

                if (!button || !availability) return;

                const equipmentData = getEquipmentData();
                availability.textContent = equipmentData[button.dataset.name] ?? 0;
            });
        }
    }

    if (event.key === "equipTrackNotifications") {
        displayNotifications();
        updateNotificationCount();
    }
});


document.addEventListener("DOMContentLoaded", function () {

    const passwordFields = [
        {
            input: document.getElementById("password"),
            button: document.getElementById("togglePassword")
        },
        {
            input: document.getElementById("signupPassword"),
            button: document.getElementById("toggleSignupPassword")
        }
    ];

    passwordFields.forEach(function (field) {

        if (!field.input || !field.button) return;

        field.button.addEventListener("click", function () {

            const isHidden = field.input.type === "password";

            field.input.type = isHidden ? "text" : "password";
            field.button.textContent = isHidden ? "HIDE" : "SHOW";

        });

    });

});
