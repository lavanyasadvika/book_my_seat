package com.seatsync.controller;

import com.seatsync.service.PaymentService;
import com.seatsync.service.RazorpayService;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * FR-PAY-05: independent server-to-server confirmation of payment events,
 * acting as the source of truth if the client-side confirmation is missed
 * (e.g. the user closes the tab). Publicly reachable (see SecurityConfig)
 * but every event is rejected unless its HMAC signature verifies.
 */
@RestController
@RequestMapping("/api/payments/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private static final Logger log = LoggerFactory.getLogger(WebhookController.class);

    private final RazorpayService razorpayService;
    private final PaymentService paymentService;

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleRazorpayWebhook(@RequestBody String rawPayload,
                                                          @RequestHeader("X-Razorpay-Signature") String signature) {
        if (!razorpayService.verifyWebhookSignature(rawPayload, signature)) {
            log.warn("Rejected Razorpay webhook: signature verification failed");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("invalid signature");
        }

        JSONObject event = new JSONObject(rawPayload);
        String eventType = event.optString("event", "");

        try {
            JSONObject paymentEntity = event.getJSONObject("payload").getJSONObject("payment").getJSONObject("entity");
            String orderId = paymentEntity.optString("order_id", null);
            String paymentId = paymentEntity.optString("id", null);

            if (orderId == null) {
                log.warn("Webhook event={} missing order_id, ignoring", eventType);
                return ResponseEntity.ok("ignored");
            }

            paymentService.handleWebhookEvent(eventType, orderId, paymentId);
        } catch (Exception e) {
            log.error("Malformed Razorpay webhook payload for event={}", eventType, e);
            return ResponseEntity.ok("ignored");
        }

        return ResponseEntity.ok("processed");
    }
}
