<?php

namespace App\Policies;

/** A company works only with its own InvoicePayment records (CompanyOwnedPolicy). */
class InvoicePaymentPolicy extends CompanyOwnedPolicy {}
