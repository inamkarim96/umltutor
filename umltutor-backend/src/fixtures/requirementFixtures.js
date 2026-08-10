"use strict";

// Shared case-study requirement texts and expected requirement models for the
// dynamic case-study-driven consistency tests.
//
// CRITICAL: these are free-text requirement STORIES, NOT hardcoded assignment
// logic. The parser is dynamic and domain-agnostic; these strings merely serve
// as realistic input for the tests (login + library domains).

// ── Login case study (matches the cross-diagram fixture in modelFixtures.js) ──
const LOGIN_CASE_STUDY = [
  "The Student can log in to the system.",
  "The system validates the user credentials.",
  "The system displays a confirmation message to the registered user.",
].join(' ');

// ── Library domain case study (proves domain-agnostic operation) ─────────────
const LIBRARY_CASE_STUDY = [
  "The Librarian can add a new book to the catalogue.",
  "The Librarian enters the book details.",
  "The system records the new book.",
  "The system confirms the book has been added.",
].join(' ');

// An intentionally mismatched requirement set, used to prove REQ-* emit.
const PAYMENT_CASE_STUDY = [
  "The Staff member can delete an account.",
  "The system processes the payment securely.",
  "The system archives the payment record.",
].join(' ');

module.exports = {
  LOGIN_CASE_STUDY,
  LIBRARY_CASE_STUDY,
  PAYMENT_CASE_STUDY,
};