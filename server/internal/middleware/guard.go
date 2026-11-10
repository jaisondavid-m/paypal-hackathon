package middleware

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// RejectMoneyFieldsInBody strictly enforces the "AI and Client Do Not Move Money" boundary.
// It rejects any request attempting to pass amount or currency to PayPal order endpoints.
// All amounts and currencies must strictly be read from the approved agreement in the database.
func RejectMoneyFieldsInBody() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body == nil {
			c.Next()
			return
		}

		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
				"error": gin.H{"code": "INVALID_BODY", "message": "Failed to read request body"},
			})
			return
		}

		// Restore body for subsequent handlers
		c.Request.Body = io.NopCloser(bytes.NewReader(bodyBytes))

		if len(bodyBytes) > 0 {
			var bodyMap map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &bodyMap); err == nil && bodyMap != nil {
				for key := range bodyMap {
					lowerKey := strings.ToLower(key)
					if lowerKey == "amount" || lowerKey == "currency" || lowerKey == "currency_code" || lowerKey == "total" || lowerKey == "value" {
						c.AbortWithStatusJSON(http.StatusBadRequest, gin.H{
							"error": gin.H{
								"code":    "SECURITY_POLICY_VIOLATION",
								"message": "AMOUNT AND CURRENCY ARE READ FROM THE APPROVED AGREEMENT. NEVER FROM LLM OR FRONTEND. Passing payment amounts in request body is forbidden by ProofRail security policy.",
							},
						})
						return
					}
				}
			}
		}

		c.Next()
	}
}

