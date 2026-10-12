<?php

namespace App\Policies;

/** A company works only with its own Tax records (CompanyOwnedPolicy). */
class TaxPolicy extends CompanyOwnedPolicy {}
