
// LOGOUT FUNCTION

const logoutBtn = document.getElementById("logoutBtn");
const logoutModal = document.getElementById("logoutModal");

const confirmLogout = document.getElementById("confirmLogout");
const cancelLogout = document.getElementById("cancelLogout");


// Open the logout popup
if (logoutBtn) {
    logoutBtn.addEventListener("click", function() {
        logoutModal.hidden = false;
    });
}


// Confirm logout
if (confirmLogout) {
    confirmLogout.addEventListener("click", function() {
        window.location.href = "sign.html";
    });
}


// Cancel logout
if (cancelLogout) {
    cancelLogout.addEventListener("click", function() {
        logoutModal.hidden = true;
    });
}


// ==============================
// BORROWING REQUEST FUNCTION
// ==============================

const borrowButtons = document.querySelectorAll(".borrow-btn");
const borrowModal = document.getElementById("borrowModal");
const borrowForm = document.getElementById("borrowForm");

const selectedEquipment = document.getElementById("selectedEquipment");
const cancelBorrow = document.getElementById("cancelBorrow");

let currentEquipment = null;


// Set today's date
const today = new Date();
today.setMinutes(today.getMinutes() - today.getTimezoneOffset());

const todayDate = today.toISOString().split("T")[0];

const borrowDateInput = document.getElementById("borrowDate");
const returnDateInput = document.getElementById("returnDate");

if (borrowDateInput && returnDateInput) {
    borrowDateInput.value = todayDate;
    borrowDateInput.min = todayDate;

    returnDateInput.min = todayDate;
}


// Open borrowing popup
borrowButtons.forEach(function(button) {

    button.addEventListener("click", function() {

        const card = button.closest(".equipment-card");

        const equipmentName = card.querySelector("h3").textContent;
        const equipmentColor = card.querySelector(".equipment-info p").textContent;
        const availability = card.querySelectorAll(".equipment-info p")[1].textContent;

        currentEquipment = {
            name: equipmentName,
            color: equipmentColor,
            availability: availability
        };

        selectedEquipment.textContent =
            equipmentName + " | " + equipmentColor + " | " + availability;

        borrowModal.hidden = false;
    });

});


// Close borrowing popup
if (cancelBorrow) {
    cancelBorrow.addEventListener("click", function() {
        borrowModal.hidden = true;
    });
}



// Submit borrowing request
if (borrowForm) {

    borrowForm.addEventListener("submit", function(event) {

        event.preventDefault();

        // Check logged-in student
        const currentUser = JSON.parse(
            localStorage.getItem("equipTrackCurrentUser")
        );

        if (!currentUser) {
            alert("Please log in before borrowing equipment.");
            window.location.href = "index.html";
            return;
        }

        if (!currentEquipment) {
            return;
        }

        const borrowDate = borrowDateInput.value;
        const returnDate = returnDateInput.value;

        if (returnDate < borrowDate) {
            alert("Return date cannot be earlier than borrow date.");
            return;
        }

        const newRequest = {
            id: Date.now(),
            equipment: currentEquipment.name,
            color: currentEquipment.color,
            availability: currentEquipment.availability,

            // Automatically get student information
            fullName: currentUser.name,
            email: currentUser.email,

            block: document.getElementById("borrowerBlock").value,
            borrowDate: borrowDate,
            returnDate: returnDate,
            purpose: document.getElementById("borrowPurpose").value,
            status: "Pending"
        };

        let requests = JSON.parse(
            localStorage.getItem("equipTrackRequests")
        ) || [];

        requests.push(newRequest);

        localStorage.setItem(
            "equipTrackRequests",
            JSON.stringify(requests)
        );

        alert("Your borrowing request has been submitted!");

        borrowForm.reset();

        borrowDateInput.value = todayDate;
        returnDateInput.min = todayDate;

        borrowModal.hidden = true;
        currentEquipment = null;

    });

}



// ==============================
// MY BORROWINGS PAGE
// ==============================

const borrowingsList = document.getElementById("borrowingsList");
const emptyBorrowings = document.getElementById("emptyBorrowings");

if (borrowingsList && emptyBorrowings) {

    const currentUser = JSON.parse(
        localStorage.getItem("equipTrackCurrentUser")
    );

    if (!currentUser) {
        alert("Please log in first.");
        window.location.href = "index.html";

    } else {

        const requests = JSON.parse(
            localStorage.getItem("equipTrackRequests")
        ) || [];

        // Only get requests belonging to the logged-in student
        const studentRequests = requests.filter(function(request) {
            return request.email &&
                request.email.toLowerCase() === currentUser.email.toLowerCase();
        });

        if (studentRequests.length === 0) {

            emptyBorrowings.hidden = false;

        } else {

            emptyBorrowings.hidden = true;

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
                status.className = "borrowing-status";

                const requestStatus = request.status || "Pending";
                status.textContent = requestStatus;

                if (requestStatus === "Approved") {
                    status.classList.add("status-approved");
                } else if (requestStatus === "Declined") {
                    status.classList.add("status-declined");
                } else {
                    status.classList.add("status-pending");
                }

                card.appendChild(status);
                borrowingsList.appendChild(card);

            });
        }
    }
}


// ==============================
// BORROWING HISTORY PAGE
// ==============================

const historyList = document.getElementById("historyList");
const emptyHistory = document.getElementById("emptyHistory");

if (historyList && emptyHistory) {

    const currentUser = JSON.parse(
        localStorage.getItem("equipTrackCurrentUser")
    );

    if (!currentUser) {
        alert("Please log in first.");
        window.location.href = "index.html";

    } else {

        const requests = JSON.parse(
            localStorage.getItem("equipTrackRequests")
        ) || [];

        // Only get this student's approved and declined requests
        const historyRequests = requests.filter(function(request) {

            return request.email &&
                request.email.toLowerCase() === currentUser.email.toLowerCase() &&
                (request.status === "Approved" ||
                 request.status === "Declined");

        });

        if (historyRequests.length === 0) {

            emptyHistory.hidden = false;

        } else {

            emptyHistory.hidden = true;

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
                    ["Return Date", request.returnDate]
                ];

                details.forEach(function(detail) {

                    const paragraph = document.createElement("p");
                    paragraph.textContent = detail[0] + ": " + detail[1];

                    card.appendChild(paragraph);

                });

                const status = document.createElement("span");
                status.className = "history-status";
                status.textContent = request.status;

                if (request.status === "Approved") {
                    status.classList.add("status-approved");
                } else {
                    status.classList.add("status-declined");
                }

                card.appendChild(status);
                historyList.appendChild(card);

            });
        }
    }
}




