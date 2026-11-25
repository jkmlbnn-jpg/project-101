
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
    const currentUser = sessionStorage.getItem("equipTrackCurrentUser");
    return currentUser ? JSON.parse(currentUser) : null;
}


/* ==============================
   ROLE-BASED PAGE PROTECTION
============================== */

(function protectUserPages() {
    const currentUser = getCurrentUser();
    const path = window.location.pathname.toLowerCase();

    const isStaffPage = path.includes("/staff_dashboard/");

    const studentPages = [
        "/home.html",
        "/equipment.html",
        "/borrowings.html",
        "/history.html",
        "/notifications.html"
    ];

    const isStudentPage = studentPages.some(function(page) {
        return path.endsWith(page);
    });

    if (!currentUser && (isStaffPage || isStudentPage)) {
        window.location.href = isStaffPage
            ? "../index.html"
            : "index.html";
        return;
    }

    if (currentUser && currentUser.role === "staff" && isStudentPage) {
        window.location.href = "staff_dashboard/staff.html";
        return;
    }

    if (currentUser && currentUser.role === "student" && isStaffPage) {
        window.location.href = "../home.html";
    }
})();

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

    sessionStorage.setItem(
        "equipTrackCurrentUser",
        JSON.stringify(currentUserData)
    );
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


function showRegistrationWarning(title, message) {
    const overlay = document.createElement("div");
    overlay.className = "registration-glass-overlay";

    overlay.innerHTML = `
        <div class="registration-glass-popup">
            <div class="registration-warning-icon">!</div>
            <h2>${title}</h2>
            <p>${message}</p>
            <button type="button" class="registration-warning-button">
                Got It
            </button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector("button").addEventListener("click", function() {
        overlay.remove();
    });
}

// =====================================
// REGISTRATION - MYSQL API
// =====================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {
    signupForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const name = formatName(
            document.getElementById("name").value
        );

        const email = document.getElementById("signupEmail")
            .value.trim().toLowerCase();

        const password = document.getElementById("signupPassword").value;
        const role = document.getElementById("signupRole").value;

        const normalizedRole = role.trim().toLowerCase();

        // STUDENT EMAIL VALIDATION
        if (
            normalizedRole === "student" &&
            !email.endsWith("@g.batstate-u.edu.ph")
        ) {
            showRegistrationWarning(
                "Student Email Required",
                "Student registration requires an official BatState-U student email ending in @g.batstate-u.edu.ph."
            );
            return;
        }

        // STAFF EMAIL VALIDATION
        if (
            normalizedRole === "staff" &&
            email.endsWith("@g.bat-state-u.edu.ph")
        ) {
            showRegistrationWarning(
                "Invalid Staff Email",
                "A student email cannot be used for a Staff account. Please use your official staff email."
            );
            return;
        }

        try {
            const response = await fetch(
                "http://localhost:3000/api/auth/register",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password,
                        role: role
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                const errorMessage = (result.message || "").toLowerCase();

                if (
                    errorMessage.includes("student email") &&
                    errorMessage.includes("staff account")
                ) {
                    showRegistrationWarning(
                        "Invalid Staff Email",
                        result.message
                    );
                } else if (
                    normalizedRole === "student" &&
                    errorMessage.includes("student email")
                ) {
                    showRegistrationWarning(
                        "Student Email Required",
                        result.message
                    );
                } else {
                    alert(result.message || "Registration failed.");
                }

                return;
            }

            signupForm.reset();

            // FROSTED GLASS SUCCESS POPUP
            const overlay = document.createElement("div");

            overlay.style.cssText = `
                position: fixed;
                inset: 0;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(10, 25, 45, 0.55);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                z-index: 99999;
                padding: 20px;
            `;

            overlay.innerHTML = `
                <div style="
                    width: 100%;
                    max-width: 380px;
                    padding: 35px 25px;
                    text-align: center;
                    color: white;
                    background: rgba(255, 255, 255, 0.15);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.4);
                    backdrop-filter: blur(25px);
                    -webkit-backdrop-filter: blur(25px);
                    border: 1px solid rgba(255,255,255,0.3);
                    border-radius: 22px;
                    box-shadow: 0 15px 45px rgba(0,0,0,0.3);
                ">
                    <div style="
                        font-size: 48px;
                        margin-bottom: 15px;
                    ">✓</div>

                    <h2 style="margin-bottom: 12px;">
                        Account Created Successfully!
                    </h2>

                    <p style="
                        color: rgba(255,255,255,0.85);
                        margin-bottom: 25px;
                    ">
                        Your EquipTrack account has been created successfully.
                    </p>

                    <button type="button" id="registrationContinueBtn"
                        style="
                            width: 100%;
                            padding: 13px;
                            border: none;
                            border-radius: 10px;
                            background: white;
                            color: #1e3a5f;
                            font-size: 15px;
                            font-weight: bold;
                            cursor: pointer;
                        ">
                        Continue
                    </button>
                </div>
            `;

            document.body.appendChild(overlay);

            // CONTINUE TO CORRECT DASHBOARD
            document.getElementById("registrationContinueBtn")
                .addEventListener("click", async function() {

                    try {
                        const loginResponse = await fetch(
                            "http://localhost:3000/api/auth/login",
                            {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    email: email,
                                    password: password
                                })
                            }
                        );

                        const loginResult = await loginResponse.json();

                        if (!loginResponse.ok) {
                            throw new Error(
                                loginResult.message || "Unable to log in."
                            );
                        }

                        // SAVE USER SESSION
                        sessionStorage.setItem(
                            "equipTrackCurrentUser",
                            JSON.stringify(loginResult.user)
                        );

                        // REDIRECT BASED ON ACCOUNT ROLE
                        if (loginResult.user.role === "staff") {
                            window.location.href =
                                "staff_dashboard/staff.html";
                        } else if (loginResult.user.role === "student") {
                            window.location.href = "home.html";
                        } else {
                            throw new Error("Invalid account role.");
                        }

                    } catch (error) {
                        console.error("Registration login error:", error);
                        alert(error.message);
                    }
                });

        } catch (error) {
            console.error("Registration error:", error);

            alert(
                "Cannot connect to the EquipTrack server. Please make sure the backend is running."
            );
        }
    });
}


/* ==============================
   LOGIN - MYSQL API
============================== */

const loginForm = document.getElementById("loginForm");

if (loginForm) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        try {
            const response = await fetch("http://localhost:3000/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (!response.ok) {
                showNoAccountPopup();
                return;
            }

            const user = result.user;

            sessionStorage.setItem(
                "equipTrackCurrentUser",
                JSON.stringify(user)
            );

            if (user.role === "staff") {
                window.location.href = "staff_dashboard/staff.html";
            } else {
                window.location.href = "home.html";
            }

        } catch (error) {
            console.error("Login error:", error);
            alert("Unable to connect to the server. Please try again.");
        }
    });
}


/* NO ACCOUNT FOUND POPUP */

function showNoAccountPopup() {
    const overlay = document.createElement("div");

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.35);
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        z-index: 99999;
    `;

    overlay.innerHTML = `
        <div style="
            width: 320px;
            max-width: 85%;
            padding: 30px;
            text-align: center;
            color: white;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.4);
            border-radius: 20px;
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            box-shadow: 0 10px 35px rgba(0, 0, 0, 0.2);
        ">
            <h2 style="margin-top: 0;">No Account Found</h2>
            <p>We couldn't find an account with those login details. Please check your email and password or create an account.</p>
            <button type="button" class="no-account-close" style="
                padding: 11px 30px;
                margin-top: 12px;
                color: #1e3a5f;
                background: white;
                border: none;
                border-radius: 10px;
                cursor: pointer;
                font-weight: bold;
            ">Got It</button>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".no-account-close").addEventListener("click", function () {
        overlay.remove();
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
        sessionStorage.removeItem("equipTrackCurrentUser");

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
let equipmentDatabase = [];

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
    if (!borrowDateInput || !returnDateInput || !borrowDateInput.value) {
        return;
    }

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
    if (!borrowDateInput || !returnDateInput) {
        return;
    }

    const todayDate = getTodayDate();

    borrowDateInput.min = todayDate;
    borrowDateInput.value = todayDate;

    returnDateInput.min = todayDate;
    returnDateInput.value = todayDate;
    returnDateInput.max = getMaxReturnDate(todayDate);
}

// Initialize borrowing dates
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

            const selectedEquipmentRecord = equipmentDatabase.find(function(item) {
                return item.name.trim().toLowerCase() ===
                    equipmentName.trim().toLowerCase();
            });

            if (!selectedEquipmentRecord) {
                alert("Equipment information could not be loaded. Please try again.");
                return;
            }

            const availableQuantity = Number(
                selectedEquipmentRecord.available_quantity
            );

            if (availableQuantity <= 0) {
            const noticeOverlay = document.createElement("div");
            noticeOverlay.className = "approval-glass-overlay";

            const noticePopup = document.createElement("div");
            noticePopup.className = "approval-glass-popup";

            const noticeTitle = document.createElement("h2");
            noticeTitle.textContent = "Equipment Unavailable";

            const noticeMessage = document.createElement("p");
            noticeMessage.textContent =
                "Sorry, no " + equipmentName + " units are currently available.";

            const noticeActions = document.createElement("div");
            noticeActions.className = "approval-glass-actions";

            const noticeButton = document.createElement("button");
            noticeButton.type = "button";
            noticeButton.className = "approval-yes";
            noticeButton.textContent = "Okay";

            noticeButton.addEventListener("click", function() {
                noticeOverlay.remove();
            });

            noticeActions.appendChild(noticeButton);
            noticePopup.appendChild(noticeTitle);
            noticePopup.appendChild(noticeMessage);
            noticePopup.appendChild(noticeActions);
            noticeOverlay.appendChild(noticePopup);

            document.body.appendChild(noticeOverlay);

            // Automatically focus the Okay button
            noticeButton.focus();

            // Prevent Enter from triggering other page actions
            noticeOverlay.addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                    event.preventDefault();
                    event.stopPropagation();
                    noticeButton.click();
                }
            });

            return;
        }

            currentEquipment = {
                id: selectedEquipmentRecord.id,
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

    // Submit borrowing request to MySQL
    borrowForm.addEventListener("submit", async function(event) {

        event.preventDefault();

        const currentUser = getCurrentUser();

        if (!currentUser) {
            alert("Please log in before borrowing equipment.");
            window.location.href = "index.html";
            return;
        }

        if (!currentEquipment || !currentEquipment.id) {
            alert("Please select equipment first.");
            return;
        }

        if (!borrowDateInput || !returnDateInput || !borrowerBlock) {
            alert("Some borrowing form fields are missing.");
            return;
        }

        const borrowDate = borrowDateInput.value;
        const returnDate = returnDateInput.value;
        const blockSection = borrowerBlock.value.trim();
        const purpose = borrowPurpose ? borrowPurpose.value.trim() : "";

        if (!borrowDate || !returnDate || !blockSection) {
            alert("Please complete all required borrowing fields.");
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

        if (
            daysBorrowed > 7 ||
            returnDate > getMaxReturnDate(borrowDate)
        ) {
            alert("Borrowing period cannot exceed 7 days.");
            return;
        }

        try {

            const response = await fetch(
                "http://localhost:3000/api/borrowings",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        equipment_id: currentEquipment.id,
                        borrow_date: borrowDate,
                        return_date: returnDate,
                        block_section: blockSection,
                        purpose: purpose
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                alert(result.message || "Unable to submit borrowing request.");
                return;
            }

            const successOverlay = document.createElement("div");
            successOverlay.className = "approval-glass-overlay";

            const successPopup = document.createElement("div");
            successPopup.className = "approval-glass-popup";

            const successTitle = document.createElement("h2");
            successTitle.textContent = "Request Submitted";

            const successMessage = document.createElement("p");
            successMessage.textContent =
                result.message || "Your borrowing request has been submitted!";

            const successActions = document.createElement("div");
            successActions.className = "approval-glass-actions";

            const successButton = document.createElement("button");
            successButton.type = "button";
            successButton.className = "approval-yes";
            successButton.textContent = "Okay";

            successButton.addEventListener("click", function() {
                successOverlay.remove();
            });

            successActions.appendChild(successButton);
            successPopup.appendChild(successTitle);
            successPopup.appendChild(successMessage);
            successPopup.appendChild(successActions);
            successOverlay.appendChild(successPopup);

            document.body.appendChild(successOverlay);

            borrowForm.reset();
            resetBorrowingDates();

            borrowModal.hidden = true;
            currentEquipment = null;

        } catch (error) {

            console.error("Borrowing submission error:", error);

            alert(
                "Cannot connect to the EquipTrack server. " +
                "Please make sure the backend is running."
            );
        }
    });

} else if (borrowButtons.length > 0) {

    console.error(
        "Borrowing modal, form, or selected equipment element is missing."
    );
}


/* ==============================
   MY BORROWINGS PAGE
============================== */

const borrowingsList = document.getElementById("borrowingsList");
const emptyBorrowings = document.getElementById("emptyBorrowings");

if (borrowingsList && emptyBorrowings) {
    loadMyBorrowings();
}

async function loadMyBorrowings() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    borrowingsList.innerHTML = "";

    try {
        const response = await fetch(
            "http://localhost:3000/api/borrowings/user/" +
            encodeURIComponent(currentUser.id)
        );

        if (!response.ok) {
            throw new Error("Unable to load your borrowing requests.");
        }

        const requests = await response.json();

        const studentRequests = requests.filter(function(request) {
            return (request.status || "Pending").toLowerCase() === "pending";
        });

        emptyBorrowings.hidden = studentRequests.length > 0;

        studentRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "borrowing-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment_name || request.equipment || "Equipment";
            card.appendChild(heading);

            const details = [
                ["Student Name", request.student_name],
                ["Email", request.student_email],
                ["Block / Section", request.block_section || request.block],
                ["Borrow Date", request.borrow_date || request.borrowDate],
                ["Return Date", request.return_date || request.returnDate],
                ["Quantity", request.quantity],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent =
                    detail[0] + ": " +
                    (detail[1] === null || detail[1] === undefined || detail[1] === ""
                        ? "Not specified"
                        : detail[1]);

                card.appendChild(paragraph);
            });

            const status = document.createElement("span");
            status.className = "borrowing-status status-pending";
            status.textContent = "Pending";

            card.appendChild(status);
            borrowingsList.appendChild(card);
        });

    } catch (error) {
        console.error("My Borrowings loading error:", error);
        emptyBorrowings.hidden = false;
        emptyBorrowings.textContent =
            "Unable to load borrowing requests. Please check the server.";
    }
}


/* ==============================
   STUDENT BORROWING HISTORY
============================== */

const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");

if (historyList && emptyHistory) {
    loadStudentBorrowingHistory();
}

function formatHistoryDate(dateValue) {
    if (!dateValue) return "Not specified";

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) return "Not specified";

    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "Asia/Manila"
    });
}

async function loadStudentBorrowingHistory() {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    historyList.innerHTML = "";

    try {
        const response = await fetch(
            "http://localhost:3000/api/borrowings/user/" +
            encodeURIComponent(currentUser.id)
        );

        if (!response.ok) {
            throw new Error("Unable to load borrowing history.");
        }

        const requests = await response.json();

        if (!Array.isArray(requests)) {
            throw new Error("Invalid borrowing history response.");
        }

        emptyHistory.hidden = requests.length > 0;

        requests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "history-card";

            const heading = document.createElement("h3");
            heading.textContent =
                request.equipment_name || request.equipment || "Equipment";
            card.appendChild(heading);

            const details = [
                ["Student Name", request.student_name],
                ["Email", request.student_email],
                ["Block / Section", request.block_section || request.block],
                ["Borrow Date", formatHistoryDate(request.borrow_date || request.borrowDate)],
                ["Return Date", formatHistoryDate(request.return_date || request.returnDate)],
                ["Quantity", request.quantity],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");

                paragraph.textContent =
                    detail[0] + ": " +
                    (detail[1] === null || detail[1] === undefined || detail[1] === ""
                        ? "Not specified"
                        : String(detail[1]));

                card.appendChild(paragraph);
            });

            const requestStatus = String(request.status || "Pending")
                .trim()
                .toLowerCase();

            const status = document.createElement("span");
            status.className = "history-status";

            if (requestStatus === "approved") {
                status.textContent = "Approved";
                status.classList.add("status-approved");
            } else if (requestStatus === "declined") {
                status.textContent = "Declined";
                status.classList.add("status-declined");
            } else if (requestStatus === "returned") {
                status.textContent = "Returned";
                status.classList.add("status-returned");
            } else {
                status.textContent = "Pending";
                status.classList.add("status-pending");
            }

            card.appendChild(status);
            historyList.appendChild(card);
        });

    } catch (error) {
        console.error("Student history loading error:", error);

        emptyHistory.hidden = false;
        emptyHistory.textContent =
            "Unable to load borrowing history. Please check the server.";
    }
}


/* ==============================
   STAFF DASHBOARD SUMMARY
============================== */

async function loadStaffDashboardSummary() {
    const totalRequestsElement = document.getElementById("totalRequests");
    const pendingRequestsElement = document.getElementById("pendingRequests");
    const approvedRequestsElement = document.getElementById("approvedRequests");
    const declinedRequestsElement = document.getElementById("declinedRequests");

    if (!totalRequestsElement) return;

    try {
        const response = await fetch("http://localhost:3000/api/borrowings/history");

        if (!response.ok) {
            throw new Error("Unable to load borrowing history.");
        }

        const requests = await response.json();

        const pendingResponse = await fetch("http://localhost:3000/api/borrowings/pending");

        if (!pendingResponse.ok) {
            throw new Error("Unable to load pending requests.");
        }

        const pendingRequests = await pendingResponse.json();

        const approvedCount = requests.filter(
            request => request.status === "Approved"
        ).length;

        const declinedCount = requests.filter(
            request => request.status === "Declined"
        ).length;

        const pendingCount = pendingRequests.length;

        totalRequestsElement.textContent =
            approvedCount + declinedCount + pendingCount;

        if (pendingRequestsElement) {
            pendingRequestsElement.textContent = pendingCount;
        }

        if (approvedRequestsElement) {
            approvedRequestsElement.textContent = approvedCount;
        }

        if (declinedRequestsElement) {
            declinedRequestsElement.textContent = declinedCount;
        }

    } catch (error) {
        console.error("Staff dashboard summary error:", error);
    }
}

loadStaffDashboardSummary();


/* ==============================
   CONFIRM EQUIPMENT RETURN
============================== */

async function confirmEquipmentReturn(borrowingId) {
    try {
        const response = await fetch(
            `http://localhost:3000/api/borrowings/${borrowingId}/return`,
            {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to confirm equipment return.");
        }

        const noticeOverlay = document.createElement("div");
        noticeOverlay.className = "approval-glass-overlay";

        const noticePopup = document.createElement("div");
        noticePopup.className = "approval-glass-popup";

        const noticeTitle = document.createElement("h2");
        noticeTitle.textContent = "Return Confirmed";

        const noticeMessage = document.createElement("p");
        noticeMessage.textContent = "Equipment return confirmed successfully!";

        const noticeActions = document.createElement("div");
        noticeActions.className = "approval-glass-actions";

        const noticeButton = document.createElement("button");
        noticeButton.type = "button";
        noticeButton.className = "approval-yes";
        noticeButton.textContent = "Okay";

        noticeButton.addEventListener("click", function() {
            noticeOverlay.remove();
        });

        noticeActions.appendChild(noticeButton);
        noticePopup.appendChild(noticeTitle);
        noticePopup.appendChild(noticeMessage);
        noticePopup.appendChild(noticeActions);
        noticeOverlay.appendChild(noticePopup);

        document.body.appendChild(noticeOverlay);

        await loadReturnEquipment();

    } catch (error) {
        console.error("Equipment return error:", error);
        alert(error.message);
    }
}


/* ==============================
   STAFF BORROWING HISTORY - MYSQL
============================== */

async function loadStaffHistory() {
    const historyList = document.getElementById("staffHistoryList");
    const emptyHistory = document.getElementById("emptyStaffHistory");

    if (!historyList || !emptyHistory) return;

    historyList.innerHTML = "";
    emptyHistory.hidden = true;

    try {
        const response = await fetch(
            "http://localhost:3000/api/borrowings/history"
        );

        if (!response.ok) {
            throw new Error("Unable to load staff borrowing history.");
        }

        const historyRequests = await response.json();
        historyRequests.sort((a, b) => Number(b.id) - Number(a.id));

        emptyHistory.hidden = historyRequests.length > 0;

        historyRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "borrowing-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment_name || "Equipment";
            card.appendChild(heading);

            const details = [
                ["Request ID", request.id],
                ["Student Name", request.student_name],
                ["Email", request.student_email],
                ["Block / Section", request.block_section],
                ["Borrow Date", formatStaffRequestDate(request.borrow_date)],
                ["Return Date", formatStaffRequestDate(request.return_date)],
                ["Quantity", request.quantity],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent =
                    detail[0] + ": " +
                    (detail[1] === null || detail[1] === undefined
                        ? "Not provided"
                        : String(detail[1]));

                card.appendChild(paragraph);
            });

            const status = document.createElement("p");
            status.textContent = "Status: " + (request.status || "Pending");
            
            status.className =
            request.status === "Approved"
                ? "status-approved"
                : request.status === "Returned"
                    ? "status-returned"
                    : "status-declined";

                if (request.status === "Returned") {
                    status.style.display = "inline-block";
                    status.style.padding = "8px 12px";
                    status.style.borderRadius = "8px";
                    status.style.fontWeight = "bold";
                }

                    card.appendChild(status);
                    historyList.appendChild(card);
                });

    } catch (error) {
        console.error("Staff history loading error:", error);
        emptyHistory.hidden = false;
        emptyHistory.textContent =
            "Unable to load staff history. Please check the backend server.";
    }
}

const staffHistoryList = document.getElementById("staffHistoryList");

if (staffHistoryList) {
    loadStaffHistory();
}


async function loadReturnEquipment() {
    const returnList = document.getElementById("returnEquipmentList");
    const emptyReturn = document.getElementById("emptyReturnEquipment");

    if (!returnList || !emptyReturn) return;

    returnList.innerHTML = "";
    emptyReturn.hidden = true;

    try {
        const response = await fetch(
            "http://localhost:3000/api/borrowings/history"
        );

        if (!response.ok) {
            throw new Error("Unable to load approved borrowings.");
        }

        const requests = await response.json();

        const approvedRequests = requests
        .filter(function(request) {
            return request.status === "Approved";
        })
        .sort(function(a, b) {
            return Number(b.id) - Number(a.id);
        });

        emptyReturn.hidden = approvedRequests.length > 0;

        approvedRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "borrowing-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment_name || "Equipment";
            card.appendChild(heading);

            const details = [
                ["Request ID", request.id],
                ["Student Name", request.student_name],
                ["Email", request.student_email],
                ["Block / Section", request.block_section],
                ["Borrow Date", formatStaffRequestDate(request.borrow_date)],
                ["Return Date", formatStaffRequestDate(request.return_date)],
                ["Quantity", request.quantity],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent =
                    detail[0] + ": " +
                    (detail[1] === null || detail[1] === undefined
                        ? "Not provided"
                        : String(detail[1]));

                card.appendChild(paragraph);
            });

            const status = document.createElement("p");
            status.textContent = "Status: Approved";
            status.className = "status-approved";
            card.appendChild(status);

            const buttonContainer = document.createElement("div");
            buttonContainer.className = "request-actions";

            const notifyButton = document.createElement("button");
            notifyButton.type = "button";
            notifyButton.textContent = "Notify Student";
            notifyButton.className = "decline-btn";

            
            notifyButton.addEventListener("click", async function() {
                notifyButton.disabled = true;
                notifyButton.textContent = "Sending...";

                try {
                    const response = await fetch(
                        `http://localhost:3000/api/notifications/reminder/${request.id}`,
                        {
                            method: "POST"
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(result.message || "Unable to send reminder.");
                    }

                    const noticeOverlay = document.createElement("div");
                    noticeOverlay.className = "approval-glass-overlay";

                    const noticePopup = document.createElement("div");
                    noticePopup.className = "approval-glass-popup";

                    const noticeTitle = document.createElement("h2");
                    noticeTitle.textContent = "Reminder Sent";

                    const noticeMessage = document.createElement("p");
                    noticeMessage.textContent = "Return reminder sent successfully!";

                    const noticeActions = document.createElement("div");
                    noticeActions.className = "approval-glass-actions";

                    const noticeButton = document.createElement("button");
                    noticeButton.type = "button";
                    noticeButton.className = "approval-yes";
                    noticeButton.textContent = "Okay";

                    noticeButton.addEventListener("click", function() {
                        noticeOverlay.remove();
                    });

                    noticeActions.appendChild(noticeButton);
                    noticePopup.appendChild(noticeTitle);
                    noticePopup.appendChild(noticeMessage);
                    noticePopup.appendChild(noticeActions);
                    noticeOverlay.appendChild(noticePopup);

                    document.body.appendChild(noticeOverlay);


                } catch (error) {
                    console.error("Reminder error:", error);
                    alert(error.message);

                } finally {
                    notifyButton.disabled = false;
                    notifyButton.textContent = "Notify Student";
                }
            });

            const returnButton = document.createElement("button");
            returnButton.type = "button";
            returnButton.textContent = "Confirm Return";
            returnButton.className = "approve-btn";

            returnButton.addEventListener("click", function() {
                showApprovalConfirmation(async function() {
                    await confirmEquipmentReturn(request.id);
                });
            });

            buttonContainer.appendChild(notifyButton);
            buttonContainer.appendChild(returnButton);
            card.appendChild(buttonContainer);

            returnList.appendChild(card);
        });

    } catch (error) {
        console.error("Return equipment loading error:", error);
        emptyReturn.hidden = false;
        emptyReturn.textContent =
            "Unable to load equipment awaiting return.";
    }
}

// INITIALIZE RETURN EQUIPMENT PAGE
const returnEquipmentList = document.getElementById("returnEquipmentList");

if (returnEquipmentList) {
    loadReturnEquipment();
}

/* ==============================
   FORMAT STAFF REQUEST DATES
============================== */

function formatStaffRequestDate(dateValue) {
    if (!dateValue) return "Not specified";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return String(dateValue);
    }

    return date.toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC"
    });
}


/* ==============================
   STAFF ACTION CONFIRMATION
============================== */

function showApprovalConfirmation(
    onConfirm,
    title = "Confirm Approval",
    message = "Are you sure you want to approve this borrowing request?"
) {
    const overlay = document.createElement("div");
    overlay.className = "approval-glass-overlay";

    overlay.innerHTML = `
        <div class="approval-glass-popup">
            <h2>${title}</h2>
            <p>${message}</p>

            <div class="approval-glass-actions">
                <button type="button" class="approval-no">No</button>
                <button type="button" class="approval-yes">Yes</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector(".approval-no").addEventListener("click", function() {
        overlay.remove();
    });

    overlay.querySelector(".approval-yes").addEventListener("click", function() {
        overlay.remove();
        onConfirm();
    });

    overlay.addEventListener("click", function(event) {
        if (event.target === overlay) {
            overlay.remove();
        }
    });
}


/* ==============================
   STAFF BORROWING REQUESTS PAGE
============================== */

async function loadStaffBorrowingRequests() {
    const staffRequestsList = document.getElementById("staffRequestsList");
    const emptyStaffRequests = document.getElementById("emptyStaffRequests");
    const staffPendingBadge = document.getElementById("staffPendingBadge");

    try {
        const response = await fetch("http://localhost:3000/api/borrowings/pending");

        if (!response.ok) {
            throw new Error("Failed to load pending requests.");
        }

        const pendingRequests = await response.json();

        // UPDATE STAFF NOTIFICATION BADGE
        if (staffPendingBadge) {
            const count = pendingRequests.length;

            staffPendingBadge.textContent = count;
            staffPendingBadge.hidden = count === 0;

            staffPendingBadge.style.cssText = `
                display: ${count === 0 ? "none" : "inline-flex"};
                align-items: center;
                justify-content: center;
                min-width: 20px;
                height: 20px;
                padding: 0 6px;
                margin-left: 8px;
                background: #e53935;
                color: white;
                border-radius: 50px;
                font-size: 11px;
                font-weight: bold;
            `;
        }

        // STOP HERE IF NOT ON REQUESTS PAGE
        if (!staffRequestsList || !emptyStaffRequests) return;

        staffRequestsList.innerHTML = "";
        emptyStaffRequests.hidden = pendingRequests.length > 0;

        pendingRequests.forEach(function(request) {
            const card = document.createElement("div");
            card.className = "borrowing-card";

            const heading = document.createElement("h3");
            heading.textContent = request.equipment_name || request.equipment || "Equipment";
            card.appendChild(heading);

            const details = [
                ["Student Name", request.student_name],
                ["Email", request.student_email],
                ["Quantity", request.quantity],
                ["Block / Section", request.block_section || request.block],
                ["Borrow Date", request.borrow_date || request.borrowDate],
                ["Return Date", request.return_date || request.returnDate],
                ["Purpose", request.purpose || "Not specified"]
            ];

            details.forEach(function(detail) {
                const paragraph = document.createElement("p");
                paragraph.textContent =
                    detail[0] + ": " + (detail[1] || "Not specified");
                card.appendChild(paragraph);
            });

            const status = document.createElement("span");
            status.className = "borrowing-status status-pending";
            status.textContent = "Pending";
            card.appendChild(status);

            const buttonContainer = document.createElement("div");
            buttonContainer.className = "request-actions";

            const declineButton = document.createElement("button");
            declineButton.textContent = "Decline";
            declineButton.className = "decline-btn";

            const approveButton = document.createElement("button");
            approveButton.textContent = "Approve";
            approveButton.className = "approve-btn";

            declineButton.addEventListener("click", function() {
                processStaffBorrowingRequest(
                    request.id,
                    "decline",
                    approveButton,
                    declineButton
                );
            });

           
            approveButton.addEventListener("click", function() {
            showApprovalConfirmation(async function() {
                await processStaffBorrowingRequest(
                    request.id,
                    "approve",
                    approveButton,
                    declineButton
                );
            });
        });

            buttonContainer.appendChild(declineButton);
            buttonContainer.appendChild(approveButton);
            card.appendChild(buttonContainer);

            staffRequestsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading staff borrowing requests:", error);
    }
}

// INITIAL LOAD
loadStaffBorrowingRequests();

// REFRESH PENDING REQUEST COUNT EVERY 30 SECONDS
setInterval(function() {
    loadStaffBorrowingRequests();
}, 30000);

/* ==============================
   PROCESS STAFF BORROWING REQUEST
============================== */

async function processStaffBorrowingRequest(
    requestId,
    action,
    approveButton,
    declineButton
) {
    // CONFIRM DECLINE
    if (action === "decline") {
        const confirmed = await new Promise(function(resolve) {
            const overlay = document.createElement("div");
            overlay.className = "approval-glass-overlay";

            overlay.innerHTML = `
                <div class="approval-glass-popup">
                    <h2>Confirm Decline</h2>
                    <p>Are you sure you want to decline this borrowing request?</p>
                    <div class="approval-glass-actions">
                        <button type="button" class="approval-no">No</button>
                        <button type="button" class="approval-yes">Yes</button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            overlay.querySelector(".approval-no").addEventListener("click", function() {
                overlay.remove();
                resolve(false);
            });

            overlay.querySelector(".approval-yes").addEventListener("click", function() {
                overlay.remove();
                resolve(true);
            });

            overlay.addEventListener("click", function(event) {
                if (event.target === overlay) {
                    overlay.remove();
                    resolve(false);
                }
            });
        });

        if (!confirmed) return;
    }

    try {
        approveButton.disabled = true;
        declineButton.disabled = true;

        const response = await fetch(
            `http://localhost:3000/api/borrowings/${requestId}/${action}`,
            {
                method: "PUT"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Unable to process request.");
        }

        await loadStaffBorrowingRequests();

    } catch (error) {
        console.error("Error processing borrowing request:", error);

        // FROSTED-GLASS ERROR POPUP
        const overlay = document.createElement("div");
        overlay.className = "approval-glass-overlay";

        overlay.innerHTML = `
            <div class="approval-glass-popup">
                <h2>Unable to Approve</h2>
                <p>${error.message}</p>
                <div class="approval-glass-actions">
                    <button type="button" class="approval-yes">Okay</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector(".approval-yes").addEventListener("click", function() {
            overlay.remove();
        });

        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) {
                overlay.remove();
            }
        });

        approveButton.disabled = false;
        declineButton.disabled = false;
    }
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

    let selectedEquipment = null;
    let currentAvailability = 0;

    // CREATE FROSTED GLASS POPUP
    const modal = document.createElement("div");
    modal.className = "availability-modal";

    modal.innerHTML = `
        <div class="availability-modal-content">
            <h2>Edit Availability</h2>
            <p id="availabilityEquipmentName"></p>

            <div class="availability-counter">
                <button type="button" id="decreaseAvailability">−</button>
                <span id="availabilityValue">0</span>
                <button type="button" id="increaseAvailability">+</button>
            </div>

            <div class="availability-modal-actions">
                <button type="button" id="cancelAvailability">Cancel</button>
                <button type="button" id="saveAvailability">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const availabilityValue = modal.querySelector("#availabilityValue");
    const equipmentNameDisplay = modal.querySelector("#availabilityEquipmentName");

    function updateCounter() {
        availabilityValue.textContent = currentAvailability;
    }

    // LOAD AVAILABILITY FROM MYSQL
    async function displayAvailability() {
        try {
            const response = await fetch("http://localhost:3000/api/equipment");

            if (!response.ok) {
                throw new Error("Unable to load equipment.");
            }

            const equipmentList = await response.json();

            staffEquipmentList.querySelectorAll(".equipment-card").forEach(function(card) {
                const button = card.querySelector(".edit-equipment-btn");
                const availability = card.querySelector(".equipment-availability");

                if (!button || !availability) return;

                const equipment = equipmentList.find(function(item) {
                    return item.name.trim().toLowerCase() ===
                        button.dataset.name.trim().toLowerCase();
                });

                if (equipment) {
                    availability.textContent = equipment.available_quantity;
                }
            });

        } catch (error) {
            console.error("Equipment loading error:", error);
        }
    }

    displayAvailability();

    // OPEN POPUP
    staffEquipmentList.querySelectorAll(".edit-equipment-btn").forEach(function(button) {
        button.addEventListener("click", async function() {
            try {
                const response = await fetch("http://localhost:3000/api/equipment");

                if (!response.ok) {
                    throw new Error("Unable to load equipment.");
                }

                const equipmentList = await response.json();

                selectedEquipment = equipmentList.find(function(item) {
                    return item.name.trim().toLowerCase() ===
                        button.dataset.name.trim().toLowerCase();
                });

                if (!selectedEquipment) {
                    throw new Error("Equipment not found.");
                }

                currentAvailability = Number(selectedEquipment.available_quantity);

                equipmentNameDisplay.textContent = selectedEquipment.name;
                updateCounter();

                modal.classList.add("active");

            } catch (error) {
                console.error("Equipment popup error:", error);
                alert(error.message);
            }
        });
    });

    // DECREASE
    modal.querySelector("#decreaseAvailability").addEventListener("click", function() {
        if (currentAvailability > 0) {
            currentAvailability--;
            updateCounter();
        }
    });

    // INCREASE
    modal.querySelector("#increaseAvailability").addEventListener("click", function() {
        currentAvailability++;
        updateCounter();
    });

    // CANCEL
    modal.querySelector("#cancelAvailability").addEventListener("click", function() {
        modal.classList.remove("active");
        selectedEquipment = null;
    });

    // CLOSE WHEN CLICKING OUTSIDE
    modal.addEventListener("click", function(event) {
        if (event.target === modal) {
            modal.classList.remove("active");
            selectedEquipment = null;
        }
    });

    // SAVE TO MYSQL
    modal.querySelector("#saveAvailability").addEventListener("click", async function() {
        if (!selectedEquipment) return;

        const saveButton = modal.querySelector("#saveAvailability");
        saveButton.disabled = true;
        saveButton.textContent = "Saving...";

        try {
            const response = await fetch(
                "http://localhost:3000/api/equipment/" +
                selectedEquipment.id + "/availability",
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        available_quantity: currentAvailability
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Unable to update availability.");
            }

            modal.classList.remove("active");
            selectedEquipment = null;

            await displayAvailability();

        } catch (error) {
            console.error("Availability update error:", error);
            alert(error.message);

        } finally {
            saveButton.disabled = false;
            saveButton.textContent = "Save";
        }
    });

})();



/* ==============================
   STUDENT NOTIFICATIONS - MYSQL
============================== */

async function displayNotifications() {
    const notificationsList = document.getElementById("notificationsList");

    if (!notificationsList) return;

    const currentUser = getCurrentUser();

    if (!currentUser) return;

    try {
        const response = await fetch(
            "http://localhost:3000/api/notifications/user/" +
            encodeURIComponent(currentUser.id)
        );

        if (!response.ok) {
            throw new Error("Unable to load notifications.");
        }

        const notifications = await response.json();

        const activeFilter = document.querySelector(".notification-filter.active");
        const filter = activeFilter ? activeFilter.dataset.filter : "all";

        let filteredNotifications = notifications;

        if (filter === "unread") {
            filteredNotifications = notifications.filter(
                notification => !notification.is_read
            );
        } else if (
            filter === "Approved" ||
            filter === "Declined" ||
            filter === "Reminder"
        ) {
            filteredNotifications = notifications.filter(
                notification => notification.status === filter
            );
        }

        notificationsList.innerHTML = "";

        if (filteredNotifications.length === 0) {
            notificationsList.innerHTML = "<p>No notifications found.</p>";
        }

        filteredNotifications.forEach(function(notification) {
            const card = document.createElement("div");
            card.className = "notification-card";

            if (!notification.is_read) {
                card.classList.add("unread");
            }

            const heading = document.createElement("h3");

            if (notification.status === "Approved") {
                heading.textContent = "Borrowing Request Approved";
            } else if (notification.status === "Reminder") {
                heading.textContent = "Return Deadline Reminder";
            } else {
                heading.textContent = "Borrowing Request Declined";
            }

            const message = document.createElement("p");
            message.textContent = notification.message;

            const date = document.createElement("small");
            date.textContent = new Date(notification.created_at)
                .toLocaleString();

            const readButton = document.createElement("button");
            readButton.type = "button";
            readButton.textContent = notification.is_read
                ? "Read"
                : "Mark as Read";
            readButton.disabled = Boolean(notification.is_read);

            readButton.addEventListener("click", function() {
                markNotificationAsRead(notification.id);
            });

            card.appendChild(heading);
            card.appendChild(message);
            card.appendChild(date);
            card.appendChild(readButton);

            notificationsList.appendChild(card);
        });

        updateNotificationCount(notifications);

    } catch (error) {
        console.error("Notification loading error:", error);
        notificationsList.innerHTML =
            "<p>Unable to load notifications. Please check the server.</p>";
    }
}



/* ==============================
   UPDATE NOTIFICATION COUNT
============================== */

async function updateNotificationCount(notifications = null) {
    const countElement = document.getElementById("notificationCount");

    if (!countElement) return;

    const currentUser = getCurrentUser();

    if (!currentUser) return;

    try {
        if (!notifications) {
            const response = await fetch(
                "http://localhost:3000/api/notifications/user/" +
                encodeURIComponent(currentUser.id)
            );

            if (!response.ok) {
                throw new Error("Unable to load notification count.");
            }

            notifications = await response.json();
        }

        const unreadCount = notifications.filter(
            notification => !notification.is_read
        ).length;

        countElement.textContent = unreadCount;
        countElement.hidden = unreadCount === 0;

    } catch (error) {
        console.error("Notification count error:", error);
    }
}


/* ==============================
   MARK ONE NOTIFICATION AS READ
============================== */

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetch(
            "http://localhost:3000/api/notifications/" +
            notificationId + "/read",
            {
                method: "PUT"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to mark notification as read.");
        }

        await displayNotifications();

    } catch (error) {
        console.error("Mark notification read error:", error);
        alert("Unable to update notification.");
    }
}


/* ==============================
   MARK ALL NOTIFICATIONS AS READ
============================== */

async function markAllNotificationsAsRead() {
    const currentUser = getCurrentUser();

    if (!currentUser) return;

    try {
        const response = await fetch(
            "http://localhost:3000/api/notifications/user/" +
            encodeURIComponent(currentUser.id) + "/read",
            {
                method: "PUT"
            }
        );

        if (!response.ok) {
            throw new Error("Unable to mark notifications as read.");
        }

        await displayNotifications();

    } catch (error) {
        console.error("Mark all notifications read error:", error);
        alert("Unable to update notifications.");
    }
}

// CLEAR ALL NOTIFICATIONS (MARK ALL AS READ)
async function clearAllNotifications() {
    const currentUser = getCurrentUser();

    if (!currentUser) return;

    try {
        const response = await fetch(
            "http://localhost:3000/api/notifications/user/" +
            encodeURIComponent(currentUser.id)
        );

        if (!response.ok) {
            throw new Error("Unable to check notifications.");
        }

        const notifications = await response.json();

        const hasUnreadNotifications = notifications.some(
            notification => Number(notification.is_read) === 0
        );

        if (!hasUnreadNotifications) return;

        const overlay = document.createElement("div");
        overlay.className = "approval-glass-overlay";

        overlay.innerHTML = `
            <div class="approval-glass-popup">
                <h2>Clear All Notifications?</h2>
                <p>Are you sure you want to mark all notifications as read?</p>

                <div class="approval-glass-actions">
                    <button type="button" class="approval-no">No</button>
                    <button type="button" class="approval-yes">Yes</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector(".approval-no").addEventListener("click", function() {
            overlay.remove();
        });

        overlay.querySelector(".approval-yes").addEventListener("click", async function() {
            overlay.remove();
            await markAllNotificationsAsRead();
        });

        overlay.addEventListener("click", function(event) {
            if (event.target === overlay) overlay.remove();
        });

    } catch (error) {
        console.error("Clear notifications error:", error);
        alert("Unable to check notifications.");
    }
}

/* ==============================
   NOTIFICATION PAGE BUTTONS
============================== */

document.querySelectorAll(".notification-filter").forEach(function(button) {
    button.addEventListener("click", function() {
        document.querySelectorAll(".notification-filter").forEach(
            function(filterButton) {
                filterButton.classList.remove("active");
            }
        );

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


// LOAD EQUIPMENT AVAILABILITY FROM MYSQL
async function loadEquipmentFromDatabase() {
    try {
        const response = await fetch("http://localhost:3000/api/equipment");

        if (!response.ok) {
            throw new Error("Failed to load equipment.");
        }

        const equipmentList = await response.json();
        equipmentDatabase = equipmentList;

        const equipmentCards = document.querySelectorAll(".equipment-card");

        equipmentCards.forEach((card) => {
            const nameElement = card.querySelector("h3");
            const availabilityElement = card.querySelector(".equipment-availability");

            if (!nameElement || !availabilityElement) return;

            const equipment = equipmentList.find(
                item => item.name.trim().toLowerCase() ===
                        nameElement.textContent.trim().toLowerCase()
            );

            if (equipment) {
                availabilityElement.textContent = equipment.available_quantity;
            }
        });

    } catch (error) {
        console.error("Equipment loading error:", error);
    }
}

document.addEventListener("DOMContentLoaded", loadEquipmentFromDatabase);

/* ==============================
   FROSTED GLASS POPUP - ENTER KEY
============================== */

document.addEventListener("keydown", function(event) {
    if (event.key !== "Enter") return;

    const activePopup = document.querySelector(
        ".approval-glass-overlay"
    );

    if (!activePopup) return;

    const okayButton = activePopup.querySelector(
        "button:not(:disabled)"
    );

    if (!okayButton) return;

    event.preventDefault();
    event.stopPropagation();

    okayButton.click();
}, true);