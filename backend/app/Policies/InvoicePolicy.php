<?php

namespace App\Policies;

/** A company works only with its own Invoice records (CompanyOwnedPolicy). */
class InvoicePolicy extends CompanyOwnedPolicy {}
