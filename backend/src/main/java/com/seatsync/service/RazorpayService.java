package com.seatsync.service;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.razorpay.Utils;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Thin wrapper around the Razorpay Java SDK. All calls use Test Mode keys
 * only (FR-PAY-07); no card/UPI details ever pass through this service -
 * only order creation and server-side signature verification.
 */
@Service
@RequiredArgsConstructor
public class RazorpayService {

    private static final Logger log = LoggerFactory.getLogger(RazorpayService.class);

    private final RazorpayClient razorpayClient;

    @Value("${razorpay.key-id}")
    private String keyId;

    @Value("${razorpay.key-secret}")
    private String keySecret;

    @Value("${razorpay.webhook-secret}")
    private String webhookSecret;

    public String getKeyId() {
        return keyId;
    }

    public String createOrder(BigDecimal amount, String currency, String receipt) {
        try {
            JSONObject request = new JSONObject();
            request.put("amount", amount.multiply(BigDecimal.valueOf(100)).intValue());
            request.put("currency", currency);
            request.put("receipt", receipt);
            request.put("payment_capture", 1);

            Order order = razorpayClient.orders.create(request);
            return order.get("id");
        } catch (RazorpayException e) {
            log.error("Failed to create Razorpay order for receipt={}", receipt, e);
            throw new IllegalStateException("Unable to initiate payment with Razorpay", e);
        }
    }

    public boolean verifyPaymentSignature(String orderId, String paymentId, String signature) {
        try {
            JSONObject options = new JSONObject();
            options.put("razorpay_order_id", orderId);
            options.put("razorpay_payment_id", paymentId);
            options.put("razorpay_signature", signature);
            return Utils.verifyPaymentSignature(options, keySecret);
        } catch (RazorpayException e) {
            log.warn("Payment signature verification threw for orderId={}: {}", orderId, e.getMessage());
            return false;
        }
    }

    public boolean verifyWebhookSignature(String payload, String signatureHeader) {
        try {
            return Utils.verifyWebhookSignature(payload, signatureHeader, webhookSecret);
        } catch (RazorpayException e) {
            log.warn("Webhook signature verification threw: {}", e.getMessage());
            return false;
        }
    }
}
