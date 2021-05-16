import axios from 'axios'

export default class RegistrationForm {
    constructor() {
        this._csrf = document.querySelector('[name="_csrf"]').value
        this.form = document.querySelector("#registration-form")
        this.allFields = document.querySelectorAll("#registration-form .form-control")
        this.insertValidationElements()
        this.username = document.querySelector("#username-register")
        this.username.previousValue = ""
        this.email = document.querySelector("#email-register")
        this.email.previousValue = ""
        this.password = document.querySelector("#password-register")
        this.password.previousValue = ""
        this.username.isUnique = false
        this.email.isUnique = false
        this.events()
    }

    //events
    events() {
        this.form.addEventListener("submit", e => {
            e.preventDefault()
            this.formSubmitHandler()
        })

        this.username.addEventListener("keyup", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        this.email.addEventListener("keyup", () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        this.password.addEventListener("keyup", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })

        this.username.addEventListener("blur", () => {
            this.isDifferent(this.username, this.usernameHandler)
        })

        this.email.addEventListener("blur", () => {
            this.isDifferent(this.email, this.emailHandler)
        })

        this.password.addEventListener("blur", () => {
            this.isDifferent(this.password, this.passwordHandler)
        })
    }


    //methods

    formSubmitHandler() {
        this.usernameImmediately()
        this.usernameAfterDelay()
        this.emailAfterDelay()
        this.passwordAfterDelay()
        this.passwordImmediately()

        if (
            this.username.isUnique &&
            !this.username.errors &&
            this.email.isUnique &&
            !this.email.errors &&
            !this.password.errors
        ) {
            this.form.submit()
        }
    }


    //is the value is different from previous value
    isDifferent(el, handler) {
        if (el.previousValue != el.value) {
            handler.call(this)
        }
        el.previousValue = el.value
    }

    //handles username field related validations
    usernameHandler() {
        this.username.errors = false
        this.usernameImmediately()
        clearTimeout(this.username.timer)
        this.username.timer = setTimeout(() => this.usernameAfterDelay(), 800)
    }

    //handles password field related validations
    passwordHandler() {
        this.password.errors = false
        this.passwordImmediately()
        clearTimeout(this.password.timer)
        this.password.timer = setTimeout(() => this.passwordAfterDelay(), 800)
    }

    passwordImmediately() {
        if (this.password.value.length > 30) {
            this.showValidationError(this.password, "Password cannot exceed 30 characters.")
        }

        if (!this.password.errors) {
            this.hideValidationError(this.password)
        }
    }

    passwordAfterDelay() {
        if (this.password.value.length < 8) {
            this.showValidationError(this.password, "Password must be at least 8 characters.")
        }
    }

    //handles email field related validations.
    emailHandler() {
        this.email.errors = false
        clearTimeout(this.email.timer)
        this.email.timer = setTimeout(() => this.emailAfterDelay(), 800)
    }
    // handles email related events that triggers after 800ms
    emailAfterDelay() {
        if (!/^\S+@\S+$/.test(this.email.value)) {
            this.showValidationError(this.email, "Please provide a valid email address.")
        }

        if (!this.email.errors) {
            axios.post('/doesEmailExist', { _csrf: this._csrf, email: this.email.value }).then((response) => {
                if (response.data) {
                    this.email.isUnique = false
                    this.showValidationError(this.email, "This email is already used.")
                } else {
                    this.email.isUnique = true
                    this.hideValidationError(this.email)
                }
            }).catch(() => {
                console.log("Please try again later.")
            })
        }


    }

    usernameImmediately() {
        if (this.username.value != "" && !/^([a-zA-Z0-9]+)$/.test(this.username.value)) {
            this.showValidationError(this.username, "Username can only contain letters and numbers")
        }

        if (this.username.value.length > 30) {
            this.showValidationError(this.username, "Username cannot exceed 30 characters")
        }

        if (!this.username.errors) {
            this.hideValidationError(this.username)
        }



    }
    usernameAfterDelay() {
        if (this.username.value.length < 3) {
            this.showValidationError(this.username, "Username must be at least 3 characters.")
        }

        if (!this.username.errors) {
            axios.post('/doesUsernameExist', { _csrf: this._csrf, username: this.username.value }).then((response) => {
                if (response.data) {
                    this.showValidationError(this.username, "This username is already taken")
                    this.username.isUnique = false
                } else {
                    this.username.isUnique = true
                }
            }).catch(() => {
                console.log("Please try again later.")
            })
        }
    }

    hideValidationError(el) {
        el.nextElementSibling.classList.remove("liveValidateMessage--visible")
    }

    showValidationError(el, message) {
        el.nextElementSibling.innerHTML = message
        el.nextElementSibling.classList.add("liveValidateMessage--visible")
        el.errors = true
    }


    insertValidationElements() {
        this.allFields.forEach(function (el) {
            el.insertAdjacentHTML("afterend", '<div class="alert alert-danger small liveValidateMessage"></div>')
        })
    }
}