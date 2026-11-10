package services

import (
	"errors"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"proofrail-backend/internal/config"
	"proofrail-backend/internal/database"
	"proofrail-backend/internal/middleware"
	"proofrail-backend/internal/models"
)

type AuthService struct {
	db  *gorm.DB
	cfg *config.Config
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{db: db, cfg: cfg}
}

type RegisterInput struct {
	Name         string `json:"name" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"`
	BusinessName string `json:"business_name"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string       `json:"token"`
	User  *models.User `json:"user"`
}

func (s *AuthService) Register(input RegisterInput) (*AuthResponse, error) {
	var count int64
	s.db.Model(&models.User{}).Where("email = ?", input.Email).Count(&count)
	if count > 0 {
		return nil, errors.New("email already registered")
	}

	hashedBytes, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		ID:           uuid.New().String(),
		Name:         input.Name,
		Email:        input.Email,
		PasswordHash: string(hashedBytes),
		BusinessName: input.BusinessName,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := s.db.Create(user).Error; err != nil {
		return nil, err
	}

	// Seed comprehensive transaction lifecycle scenarios for new users
	database.SeedComprehensiveTransactionsForUser(s.db, *user)

	token, err := middleware.GenerateToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  user,
	}, nil
}

func (s *AuthService) Login(input LoginInput) (*AuthResponse, error) {
	var user models.User
	if err := s.db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}

	token, err := middleware.GenerateToken(user.ID, user.Email, s.cfg)
	if err != nil {
		return nil, err
	}

	return &AuthResponse{
		Token: token,
		User:  &user,
	}, nil
}

func (s *AuthService) GetUserByID(userID string) (*models.User, error) {
	var user models.User
	if err := s.db.Where("id = ?", userID).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}
