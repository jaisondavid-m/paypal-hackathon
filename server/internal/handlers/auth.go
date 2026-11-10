package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"proofrail-backend/internal/services"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input services.RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	resp, err := h.authService.Register(input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "REGISTRATION_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data": resp,
		"meta": gin.H{"status": "success"},
	})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input services.LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	resp, err := h.authService.Login(input)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "AUTH_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": resp,
		"meta": gin.H{"status": "success"},
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userID := c.GetString("userID")
	user, err := h.authService.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "USER_NOT_FOUND", "message": "User profile not found"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": user,
		"meta": gin.H{"status": "success"},
	})
}
